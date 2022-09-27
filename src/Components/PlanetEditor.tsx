import React, { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react'
import './PlanetEditor.scss'

import frag from '../Shaders/fragment.frag';
import vert from '../Shaders/vertex.vert';
import skyVert from '../Shaders/Skybox/vertex.vert';
import skyFrag from '../Shaders/Skybox/fragment.frag';
import { PlanetRenderer } from './PlanetRenderer';
import { TerrainFace } from '../Mesh/TerrainFace';
import { ShapeSettings } from '../Mesh/Noise/ShapeSettings';
import { ShapeGenerator } from '../Mesh/Noise/ShapeGenerator';
import { Clamp, ClampAngle } from '../mathHelper';
import ShapesSettingsEditor from './ShapesSettingsEditor';
import useDebounce from '../Utils/UseDebounce';
import GradientEditor from './GradientEditor';
import useInterval from '../Utils/UseInterval';

interface PlanetEditorProps{
  
}

function PlanetEditor(props:PlanetEditorProps) {
  
  const [shapeSettings, setShapeSettings] = useState<ShapeSettings>(new ShapeSettings());
  const shapeGenerator = useRef(new ShapeGenerator(shapeSettings));
  const renderer = useRef<PlanetRenderer>(new PlanetRenderer());  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotationX, setRotationX] = useState<number>(0);
  const [rotationY, setRotationY] = useState<number>(0);
  const [dst, setDst] = useState<number>(5);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUsingCanvas, setIsUsingCanvas] = useState<boolean>(false);
  const [gradientImage,setGradientImage] = useState<string>('');

  const debouncedShapeSettings = useDebounce({value:shapeSettings, delay:100});

  const pushFace = useCallback((facingDir:number[])=>{

    const newFace = new TerrainFace(100, facingDir, shapeGenerator.current);
    newFace.MakeVertices();
    return newFace;
  },[])

  const makePlanet = useCallback(()=>{

    if(renderer.current.positionBuffer.length>0) renderer.current.clearMeshes();

    const faces = [
      pushFace([1,0,0]),
      pushFace([-1,0,0]),
      pushFace([0,1,0]),
      pushFace([0,-1,0]),
      pushFace([0,0,1]),
      pushFace([0,0,-1]),
    ]
    const planetVertices = faces.map(face=>face.points).flat();
    const planetNormals = faces.map(face=>face.verticeNormals).flat();
    renderer.current.pushMesh(planetVertices, planetNormals);
  },[])

  useEffect(()=>{
    if(!canvasRef.current) return;    

    if(!renderer.current.gl || !renderer.current.program){
      renderer.current.initGL(canvasRef.current);
      renderer.current.initScene(vert, frag, skyVert, skyFrag);
      makePlanet();
    }
    renderer.current.setPlanetTexture(gradientImage);
  },[canvasRef.current, rotationX, rotationY, dst, gradientImage])

  useEffect(()=>{
    shapeGenerator.current.OnNoiseSettingsChange(shapeSettings);
    makePlanet();
    renderer.current.clearScene();
    renderer.current.renderScene(rotationX, rotationY, 0, dst,shapeGenerator.current);
  },[debouncedShapeSettings])

  useInterval(()=>{
    renderer.current.clearScene();
    renderer.current.renderScene(rotationX, rotationY, 0, dst,shapeGenerator.current)
  }, 10)

  return (
    <div className={`planetEditor ${isUsingCanvas && 'no-scroll'}`}>
      <canvas id="planetCanvas" ref={canvasRef} width={640} height={360}
      onMouseEnter={()=>{
      const html = document.documentElement;
      const {body} = document;
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';}}
      onMouseDown={()=>setIsDragging(true)}
      onMouseUp={()=>setIsDragging(false)}
      onMouseLeave={()=>{
        setIsDragging(false);
        const html = document.documentElement;
        const {body} = document;
        html.style.overflow = 'unset';
        body.style.overflow = 'unset';
      }}      
      onMouseMove={(e)=>{
        if(!isDragging) return;
        setRotationY(prev=>prev - e.movementX);
        setRotationX(prev=>ClampAngle(prev - e.movementY,-85,85));
      }}
      onWheel={(e)=>{
        setDst(prev=>Clamp(prev+e.deltaY/100, .5, 40));
      }}
      
      >
      </canvas>
      <ShapesSettingsEditor shapeSettings={shapeSettings} setShapeSettings={setShapeSettings}/>
      <GradientEditor setGradientImage={setGradientImage}/>
    </div>
  )
}

export default PlanetEditor