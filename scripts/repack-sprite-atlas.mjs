import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [inputArg, outputArg, columnsArg = '4', rowsArg = '4', safeArg = '44', preserveArg = ''] = process.argv.slice(2);
if (!inputArg || !outputArg) throw new Error('Usage: node scripts/repack-sprite-atlas.mjs INPUT OUTPUT [COLUMNS] [ROWS] [SAFE_MARGIN] [EDGE_TO_EDGE_FRAMES]');
const input = resolve(inputArg); const output = resolve(outputArg);
const columns = Number(columnsArg); const rows = Number(rowsArg);
const safe = Number(safeArg);
const preserveFrames = preserveArg.split(',').filter(Boolean).map(Number);
const source = await readFile(input);
const browser = await chromium.launch({headless:true});
const page = await browser.newPage();
const result = await page.evaluate(async({dataUrl,columns,rows,safe,preserveFrames})=>{
  const image=new Image();image.src=dataUrl;await image.decode();
  const sourceCanvas=document.createElement('canvas');sourceCanvas.width=image.naturalWidth;sourceCanvas.height=image.naturalHeight;
  const sourceContext=sourceCanvas.getContext('2d',{willReadFrequently:true});sourceContext.drawImage(image,0,0);
  const sourcePixels=sourceContext.getImageData(0,0,sourceCanvas.width,sourceCanvas.height).data;
  const width=sourceCanvas.width;const height=sourceCanvas.height;const visited=new Uint8Array(width*height);
  const queue=new Int32Array(width*height);const groups=Array.from({length:columns*rows},()=>[]);
  const opaque=index=>sourcePixels[index*4+3]>24;
  for(let start=0;start<visited.length;start+=1){
    if(visited[start]||!opaque(start))continue;
    let head=0;let tail=0;queue[tail++]=start;visited[start]=1;
    let minX=width,minY=height,maxX=0,maxY=0,count=0,sumX=0,sumY=0;
    while(head<tail){
      const index=queue[head++];const x=index%width;const y=Math.floor(index/width);
      minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);count+=1;sumX+=x;sumY+=y;
      for(let oy=-1;oy<=1;oy+=1)for(let ox=-1;ox<=1;ox+=1){
        if(!ox&&!oy)continue;const nx=x+ox;const ny=y+oy;if(nx<0||ny<0||nx>=width||ny>=height)continue;
        const next=ny*width+nx;if(!visited[next]&&opaque(next)){visited[next]=1;queue[tail++]=next;}
      }
    }
    if(count<2)continue;
    const centerX=sumX/count;const centerY=sumY/count;let nearest=0;let nearestDistance=Infinity;
    for(let row=0;row<rows;row+=1)for(let column=0;column<columns;column+=1){
      const targetX=(column+.5)*width/columns;const targetY=(row+.5)*height/rows;
      const distance=(centerX-targetX)**2+(centerY-targetY)**2;
      if(distance<nearestDistance){nearestDistance=distance;nearest=row*columns+column;}
    }
    groups[nearest].push({minX,minY,maxX,maxY,count});
  }
  const canvas=document.createElement('canvas');const cell=320;canvas.width=cell*columns;canvas.height=cell*rows;
  const context=canvas.getContext('2d');const margins=[];const bounds=[];
  groups.forEach((components,index)=>{
    const column=index%columns;const row=Math.floor(index/columns);const left=column*cell;const top=row*cell;
    if(preserveFrames.includes(index)){
      const sourceX0=Math.round(column*width/columns);const sourceY0=Math.round(row*height/rows);
      const sourceX1=Math.round((column+1)*width/columns);const sourceY1=Math.round((row+1)*height/rows);
      context.drawImage(sourceCanvas,sourceX0,sourceY0,sourceX1-sourceX0,sourceY1-sourceY0,left,top,cell,cell);
      bounds.push({index,preserved:true,source:[sourceX0,sourceY0,sourceX1-1,sourceY1-1],target:[left,top,cell,cell]});
      return;
    }
    const meaningful=components.filter(component=>component.count>=5);
    if(!meaningful.length)throw new Error(`No sprite content found for frame ${index}`);
    const minX=Math.min(...meaningful.map(component=>component.minX));const minY=Math.min(...meaningful.map(component=>component.minY));
    const maxX=Math.max(...meaningful.map(component=>component.maxX));const maxY=Math.max(...meaningful.map(component=>component.maxY));
    const sourceWidth=maxX-minX+1;const sourceHeight=maxY-minY+1;const scale=Math.min((cell-safe*2)/sourceWidth,(cell-safe*2)/sourceHeight);
    const targetWidth=sourceWidth*scale;const targetHeight=sourceHeight*scale;
    const targetX=left+(cell-targetWidth)/2;const targetY=top+cell-safe-targetHeight;
    context.drawImage(sourceCanvas,minX,minY,sourceWidth,sourceHeight,targetX,targetY,targetWidth,targetHeight);
    const margin=Math.min(targetX-left,targetY-top,left+cell-(targetX+targetWidth),top+cell-(targetY+targetHeight));
    margins.push(Math.floor(margin));bounds.push({index,source:[minX,minY,maxX,maxY],target:[targetX,targetY,targetWidth,targetHeight]});
  });
  return{dataUrl:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height,margins,bounds};
},{dataUrl:`data:image/png;base64,${source.toString('base64')}`,columns,rows,safe,preserveFrames});
await browser.close();
const minimumMargin=Math.min(...result.margins);
if(minimumMargin<Math.max(4,safe-2))throw new Error(`Unsafe repacked atlas margin: ${minimumMargin}px`);
await writeFile(output,Buffer.from(result.dataUrl.split(',')[1],'base64'));
process.stdout.write(`${output}: ${result.width}x${result.height}, minimum guarded-frame margin ${minimumMargin}px, edge-to-edge frames ${preserveFrames.join(',') || 'none'}\n`);
