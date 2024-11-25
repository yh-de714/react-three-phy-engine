import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useThree } from "@react-three/fiber"
import * as THREE from "three";

import { phy, pool, math } from 'phy-engine';
import { Controller } from './lib/Controller';

const CameraBase = {	
	theta:0,
	phi:12,
	distance:12,
	fov:50,
	x:0,
	y:2,
	z:0,
	time:0
}

function Museum(props) {
    const {scene} = useThree();
    let camera, renderer, controls, followGroup;
    let bob, jump = false, oy = 0, vy = 0;
    const tmpV1 = new THREE.Vector3();
    const tmpV2 = new THREE.Vector3();
    let tmpAcc = 0;
    let rs = 0, ts = 0;
    const diagonal = 1/Math.sqrt(2);
    const speed = {
        idle:0,
        walk:10,
        run:20,
    }

    const init =()=>{          
        renderer = new THREE.WebGLRenderer( { antialias: true } );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.shadowMap.enabled = true;
        renderer.toneMappingExposure = Math.pow( 0.68, 5.0 );        
        document.getElementById("canvas").appendChild( renderer.domElement );        
        camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 1000 );   
        let hemiLight = new THREE.HemisphereLight( 0xddeeff, 0x0f0e0d, 0.6 );
        scene.add( hemiLight );
        let p_light = new THREE.PointLight(0xffffff, 1000, 100, 2);
        p_light.position.set(-6,3,5);
        p_light.castShadow = true;
        scene.add(p_light);

        let light = new THREE.DirectionalLight( 0x808080, 1 );
        light.distance = 30;
        camera.near = 5;
        camera.far = 70;
        light.shadow.bias = - 0.0005;
        light.shadow.radius = 4;
        light.shadow.mapSize.width = light.shadow.mapSize.height = 2048 * 2
        light.position.set(6,3,5);
        scene.add(light)
        scene.background = new THREE.Color( 0x000000 );
        scene.add( new THREE.AmbientLight( 0x808080 ));  
        window.addEventListener( 'resize', onWindowResize );
    }
    const initEngine = () => {
        phy.init( { 
        type:"JOLT", 
        worker:false,
        scene:scene,
        callback:onComplete, 
        })
    }
    const onComplete = () => {
        followGroup = new THREE.Group()
        followGroup.name = 'followGroup'
        scene.add( followGroup )
        controls = new Controller( camera, renderer.domElement, followGroup )
        controls.resetAll();
        controls.moveCam( {...CameraBase} )
        controls.update()
        phy.set({ substep:4, gravity:[0,-9.81,0], key:true }) 
        phy.add({ type:'box', name:'floor', size:[300,1,300], pos:[0, -0.5, 0], visible:false})
        phy.setControl(controls);
        let r = 0.3        
        bob = phy.add({ 
            type:'capsule', 
            name:'bob', 
            material:'skinny', 
            size:[ r,1.8-(2*r) ], pos:[0,3,0], angularFactor:[0,0,0], 
            density:2, damping:[0.01,0], friction:0.5, group:32,   
            inertia:[0,0,0],     
            regular:true,
            filter:[1,-1,[1, 3, 4,5,9], 0],
            ray:false,
            noGravity:true,
            neverSleep:true,
            mass:2
           
        })
        phy.follow('bob', { direct:true, simple:true, decal:[0.3, 1, -0.3] })
        phy.add({ type:'contact', b1:'bob', b2:'floor', callback: showContact })
        let i = 100, s,a,d;
        while(i--){
            s = math.rand( 0.2, 2 )
            a = math.rand(-Math.PI, Math.PI)
            d = 10 + math.rand(1, 5)
            phy.add({ type:'box', size:[s], pos:[ d * Math.sin(a), (s*0.5), d * Math.cos(a)], rot:[0,a*math.todeg,0], density:math.randInt(0,1)? 0: s })
        }
        phy.setPostUpdate ( update )
    }

    const showContact = ( d ) => {
        if( d.hit ) { bob.material.color.setHex( 0xFFFFFF ) }
        else bob.material.color.setHex( 0x00FF88 ) 
    }
    
    const update = () => {            
        let r = phy.getAzimut()
        let key = phy.getKey()   
        let anim = key[7] !== 0 ? 'run' : 'walk'
        if( key[0] === 0 && key[1] === 0 ) anim = 'idle'   
        let m = key[0] !== 0 && key[1] !== 0 ? diagonal : 1
        if( key[0] !== 0 || key[1] !== 0 ){ 
            tmpAcc += 0.2
            tmpAcc = math.clamp( tmpAcc, 1, speed[anim] )
            rs += key[0] * tmpAcc
            ts += key[1] * tmpAcc
        } 
        if( key[0] === 0 && key[1] === 0 ) tmpAcc = 0
        if( key[0] === 0 ) rs = 0
        if( key[1] === 0 ) ts = 0
        rs = math.clamp( rs, -speed[anim], speed[anim] ) * m
        ts = math.clamp( ts, -speed[anim], speed[anim] ) * m
        if( !jump && key[4] ){ vy = 30; jump = true; }
        if( jump ){    
            vy-=1;
            if(vy <= 0 ){ 
                vy = 0; 
                if( bob.position.y === oy ) jump = false;
            }
         }
    
   
        let g = (-9.81) + vy;
        tmpV1.set( rs, g, ts ).applyAxisAngle( { x:0, y:1, z:0 }, r );
        tmpV2.set( 0, 0, 0 );    
        phy.change({ name:'bob', linearVelocity: tmpV1.toArray(), angularVelocity: tmpV2.toArray(), wake:true });    
        oy = bob.position.y;
    }


    const animate = (stamp = 0.1)=>{
        let delta = phy.getDelta()
        requestAnimationFrame( animate );
        phy.doStep( stamp );
        if( controls ) controls.up( delta)
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
