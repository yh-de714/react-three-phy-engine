import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useThree } from "@react-three/fiber"
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { phy, pool, math } from 'phy-engine';
;
function Museum(props) {
  const {scene} = useThree();
  let camera, renderer, controler;  
  const init =()=>{    
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.toneMappingExposure = Math.pow( 0.68, 5.0 );
    // document.getElementById("canvas").removeChild();
    document.getElementById("canvas").appendChild( renderer.domElement );
    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
    camera.position.set(0,3,7);
    controler = new OrbitControls( camera, renderer.domElement );
    controler.target.set( 0, 3, 0 );
    controler.screenSpacePanning = true;
    controler.update();
    let hemiLight = new THREE.HemisphereLight( 0xddeeff, 0x0f0e0d, 0.6 );
    scene.add( hemiLight );
    let light = new THREE.PointLight(0xffffff, 1000, 100, 2);
    light.position.set(-6,3,5);
    light.castShadow = true;
    scene.add(light);
    let light2 = new THREE.PointLight(0xff0000, 1000, 100, 2);
    light2.position.set(6,3,-5);
    light2.castShadow = true;
    scene.add(light2);
    scene.background = new THREE.Color( 0x000000 );
    scene.add( new THREE.AmbientLight( 0x808080 ));  
    window.addEventListener( 'resize', onWindowResize );
  }
  const initEngine = () => {
    phy.init( { 
      type:"HAVOK", 
      worker:false,
      scene:scene,
      callback:onComplete, 
    })
  }
  const onComplete = () => {
    phy.set({ substep:1, gravity:[0,-9.81,0], fps:60 })

    // add static ground
    let p = phy.add({ type:'plane', size:[300,1,300], visible:true });
    p.castShadow = false;

    phy.add({ type:'highSphere', size:[2], pos:[0,2,-10], mass:2, impulse:[0,0,40] });

    let i = 100, d = 0, l=0;
    let pos = [0, 0, 0];
    let line = 10;
    let maxLine = Math.round( i / line );
    let decalX = -((maxLine*0.5)*2)+1

    while(i--){ 
        pos = [decalX + d*2, 0.5 + l*1, 0]
        if(l%2 == 0) pos[0] += 0.5
        else pos[0] -= 0.5
        phy.add({ type:'box', size:[2,1,0.5], pos:pos, mass:1, radius:0.1 });
        d++
        if(d===maxLine){ 
            d = 0
            l++
        }
    }
  }

  const animate = (stamp = 0)=>{
    requestAnimationFrame( animate );
    phy.doStep( stamp );
    renderer.render(scene, camera );
  }
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
 }

  useEffect(() => {
    init();
    initEngine();
    animate();
  }, [])
  return (
    <mesh/>
  )
}

function App() {
  return (
    <>
      <div style={{ width: "1px", height: "1px" }}>
        <Canvas>
          <Museum />
        </Canvas>
      </div>
      <div id="canvas" style={{ position:"absolute", top:"0" }}></div>   
    </>
  )
}

export default App
