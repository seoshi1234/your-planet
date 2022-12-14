import './GradientEditor.scss';


import React, { useEffect, useRef, useState } from 'react'
import { GradientRenderer, IGradientKey } from './GradientRenderer';
import vert from '../Shaders/Gradient/vertex.vert';
import frag from '../Shaders/Gradient/fragment.frag';
import GradientKey from './GradientKey';
import { Vec3 } from '../vector';
import { InversedLerp } from '../mathHelper';
import useDebounce from '../Utils/UseDebounce';

import Button from './UI/Button';
import {
  MdDelete
} from 'react-icons/md'
import { defaultColorKeys } from '../Mesh/DefaultColorKeys';

interface GradientEditorProps{
  setGradientImage:(image:string)=>void;
}

function GradientEditor(props:GradientEditorProps) {

  const renderer = GradientRenderer.getGradientRenderer();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gradientKeys, setGradientKeys] = useState<IGradientKey[]>([...defaultColorKeys])
  const [draggedKey, setDraggedKey] = useState<number>(-1);
  const [selectedKey, setSelectedKey] = useState<number>(-1);
  const getRect = ()=> canvasRef.current?.getBoundingClientRect()

  const debouncedGradientKeys = useDebounce({value:gradientKeys, delay:100});
  
  const movePos=(diff:number, i:number)=>{
    const newGradientKeys= [...gradientKeys];
    let prevPos = newGradientKeys[i].pos;
    prevPos += diff;
    if(prevPos > 1) prevPos = 1;
    if(prevPos < 0) prevPos = 0;
    newGradientKeys[i].pos = prevPos;
    setGradientKeys(newGradientKeys);
  }

  const addKey=(pos:number)=>{
    const newGradientKeys = [...gradientKeys];
    newGradientKeys.push({color:[0,0,0],pos:pos});
    setGradientKeys(newGradientKeys);
  }

  const deleteKey=(idx:number)=>{
    if(gradientKeys.length == 1 || selectedKey==-1) return;
    setGradientKeys(prevKeys=>{
      setSelectedKey(-1);
      prevKeys.splice(idx, 1);
      return [...prevKeys];
    })
  }
  const deleteAllKey=()=>{
    if(gradientKeys.length == 1) return;
    setGradientKeys(prevKeys=>{
      setSelectedKey(-1);
      return [...[prevKeys[0]]];
    })
  }

  useEffect(()=>{
    if(!canvasRef.current) return;    

    if(!renderer.gl || !renderer.program){
      renderer.initGL(canvasRef.current);
      renderer.initScene(vert, frag);
    }
    renderer.makePlane([...gradientKeys]);

    renderer.clearScene();

    renderer.renderScene();

    props.setGradientImage(canvasRef.current.toDataURL('png'));

  },[canvasRef.current, debouncedGradientKeys])


  return (
    <div className='gradientEditor'
    onMouseUp={()=>setDraggedKey(-1)}
    onMouseLeave={()=>setDraggedKey(-1)}
    onMouseMove={(e)=>{
      if(draggedKey != -1)
        movePos(e.movementX/(getRect().right-getRect().left), draggedKey);
    }}
    >
      <canvas className="gradientRenderer" ref={canvasRef}
        onClick={(e)=>{
          addKey(InversedLerp(getRect().left, getRect().right, e.clientX));
        }}
      />
      <div className="gradientKeys">
        {
          gradientKeys.map((key,i)=>{
            return(
              <GradientKey keyInfo={key} key={i} dragged={i===draggedKey} selected={i===selectedKey}
                setColor={(color:Vec3)=>{
                  const newGradientKeys= [...gradientKeys];
                  newGradientKeys[i].color = color;
                  setGradientKeys(newGradientKeys);
                }}
                setDragged={(dragged:boolean)=>setDraggedKey(dragged ? i : -1)}
                setSelected={(selected:boolean)=>setSelectedKey(selected ? i : -1)}
                left={canvasRef.current?.getBoundingClientRect().left}
                right={canvasRef.current?.getBoundingClientRect().right}
              />
            )
          })
        }
      </div>
      <Button colors={'red'} onClick={()=>deleteKey(selectedKey)}><MdDelete/> Delete</Button>
      <Button colors={'red'} onClick={deleteAllKey}><MdDelete/> Delete All</Button>
    </div>
  )
}

export default GradientEditor