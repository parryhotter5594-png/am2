// FIX: Moved the triple-slash directive to the top of the file. This directive must be the first thing in the file for TypeScript to correctly load the type definitions for react-three-fiber and recognize its custom JSX elements like `<group>` and `<primitive>`.
/// <reference types="@react-three/fiber" />
import React, { Suspense, useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Center } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { ValidationResult } from '../types';

// --- Geometry Calculation Helpers ---

function signedVolumeOfTriangle(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): number {
    return p1.dot(p2.cross(p3)) / 6.0;
}

function calculateVolume(geometry: THREE.BufferGeometry): number {
    if (!geometry.isBufferGeometry) return 0;
    const position = geometry.attributes.position;
    let volume = 0;
    const p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), p3 = new THREE.Vector3();

    if (geometry.index) {
        const index = geometry.index;
        for (let i = 0; i < index.count; i += 3) {
            p1.fromBufferAttribute(position, index.getX(i));
            p2.fromBufferAttribute(position, index.getX(i + 1));
            p3.fromBufferAttribute(position, index.getX(i + 2));
            volume += signedVolumeOfTriangle(p1, p2, p3);
        }
    } else {
        for (let i = 0; i < position.count; i += 3) {
            p1.fromBufferAttribute(position, i);
            p2.fromBufferAttribute(position, i + 1);
            p3.fromBufferAttribute(position, i + 2);
            volume += signedVolumeOfTriangle(p1, p2, p3);
        }
    }
    return Math.abs(volume);
}

// --- Components ---

interface ModelProps {
  url: string;
  fileType: string;
  rotation: [number, number, number];
  validationResult: ValidationResult | null;
  highlightingEnabled: boolean;
  onGeometryCalculated: (data: { volume_cm3: number; dimensions_mm: { x: number; y: number; z: number; } }) => void;
}

const Model: React.FC<ModelProps> = ({ url, fileType, rotation, validationResult, highlightingEnabled, onGeometryCalculated }) => {
  const lowerFileType = fileType.toLowerCase();
  
  const loader = useMemo(() => {
    if (lowerFileType === 'stl') return STLLoader;
    if (lowerFileType === 'obj') return OBJLoader;
    return STLLoader; // Fallback to STL
  }, [lowerFileType]);

  const loadedObject = useLoader(loader, url);

  const memoizedModel = useMemo<THREE.Object3D | null>(() => {
    if (!loadedObject) return null;
    // STLLoader returns BufferGeometry, which is not an Object3D. We must wrap it in a Mesh.
    // OBJLoader returns a Group, which is an Object3D.
    if (loadedObject instanceof THREE.BufferGeometry) {
      const material = new THREE.MeshStandardMaterial();
      return new THREE.Mesh(loadedObject, material);
    }
    return loadedObject as THREE.Object3D;
  }, [loadedObject]);


  useEffect(() => {
    if (!memoizedModel) return;
    
    let totalVolumeMm3 = 0;
    const geometries: THREE.BufferGeometry[] = [];
    
    memoizedModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            geometries.push(child.geometry);
        }
    });

    geometries.forEach(geom => totalVolumeMm3 += calculateVolume(geom));
    
    const box = new THREE.Box3().setFromObject(memoizedModel);
    const dimensionsMm = box.getSize(new THREE.Vector3());

    onGeometryCalculated({
        volume_cm3: totalVolumeMm3 / 1000,
        dimensions_mm: { x: dimensionsMm.x, y: dimensionsMm.y, z: dimensionsMm.z },
    });
  }, [memoizedModel, onGeometryCalculated]);
  
  const scene = useMemo(() => {
    if (!memoizedModel) return null;

    const modelClone = memoizedModel.clone();
    
    const defaultMaterial = new THREE.MeshStandardMaterial({ color: '#00bcd4', metalness: 0.1, roughness: 0.5 });
    
    if (!highlightingEnabled) {
      modelClone.traverse(child => {
        if (child instanceof THREE.Mesh) child.material = defaultMaterial;
      });
      return <primitive object={modelClone} />;
    }

    const hasErrors = (validationResult?.errors?.length ?? 0) > 0;
    const baseColor = hasErrors ? new THREE.Color('yellow') : new THREE.Color('#00bcd4');
    const supportColor = new THREE.Color('red');
    
    // An "overhang angle" of 61 degrees is typically measured from the horizontal plane.
    // This corresponds to an angle of (90 + 61) = 151 degrees from the vertical 'up' vector.
    // This logic correctly excludes vertical walls (90 degrees) and only highlights true overhangs.
    const overhangThresholdRad = (90 + 61) * (Math.PI / 180); 
    const upVector = new THREE.Vector3(0, 1, 0); // World up direction

    // Use the group's rotation for highlighting calculations
    const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation));

    modelClone.traverse(child => {
      if (child instanceof THREE.Mesh) {
        const geom = child.geometry.clone();
        if (!geom.attributes.position) return;
        
        const colors: number[] = [];
        const position = geom.attributes.position;
        const faceNormal = new THREE.Vector3();
        const p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), p3 = new THREE.Vector3();

        for (let i = 0; i < position.count; i += 3) {
            p1.fromBufferAttribute(position, i);
            p2.fromBufferAttribute(position, i + 1);
            p3.fromBufferAttribute(position, i + 2);
            
            faceNormal.copy(p2).sub(p1).cross(p3.sub(p1)).normalize();
            // Apply the current rotation to the normal to get its world direction
            faceNormal.applyMatrix4(rotationMatrix);

            const angle = faceNormal.angleTo(upVector);
            const color = angle > overhangThresholdRad ? supportColor : baseColor;

            colors.push(color.r, color.g, color.b);
            colors.push(color.r, color.g, color.b);
            colors.push(color.r, color.g, color.b);
        }
        
        geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        child.geometry = geom;
        child.material = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.1, roughness: 0.5 });
      }
    });

    return <primitive object={modelClone} />;
  }, [memoizedModel, rotation, highlightingEnabled, validationResult]);

  return scene;
};

interface ThreeDViewerProps {
  modelUrl: string;
  fileType: string;
  rotation: [number, number, number];
  enabled: boolean;
  validationResult: ValidationResult | null;
  highlightingEnabled: boolean;
  onModelLoad: (data: { volume_cm3: number; dimensions_mm: { x: number; y: number; z: number; } }) => void;
  onDimensionsUpdate: (dimensions_mm: { x: number; y: number; z: number; }) => void;
}

type ModelData = { volume_cm3: number; dimensions_mm: { x: number; y: number; z: number; } };

const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ modelUrl, fileType, rotation, enabled, validationResult, highlightingEnabled, onModelLoad, onDimensionsUpdate }) => {
    const groupRef = useRef<THREE.Group>(null!);
    const analysisTriggered = useRef(false);
    const [modelData, setModelData] = useState<ModelData | null>(null);

    // Reset state when a new file is uploaded
    useEffect(() => {
        analysisTriggered.current = false;
        setModelData(null);
    }, [modelUrl]);

    // Callback from Model component when geometry is first calculated
    const handleGeometryCalculated = useCallback((data: ModelData) => {
        setModelData(data);
    }, []);

    // Trigger the one-time analysis when enabled and data is ready
    useEffect(() => {
        if (enabled && modelData && !analysisTriggered.current) {
            analysisTriggered.current = true;
            onModelLoad(modelData);
        }
    }, [enabled, modelData, onModelLoad]);
    
    // Update dimensions in App state whenever rotation changes
    useEffect(() => {
        if (groupRef.current && modelData) { // Only update if a model has been loaded
            const timer = setTimeout(() => {
                const box = new THREE.Box3().setFromObject(groupRef.current);
                const dimensionsMm = box.getSize(new THREE.Vector3());
                onDimensionsUpdate({ x: dimensionsMm.x, y: dimensionsMm.y, z: dimensionsMm.z });
            }, 50); // Debounce slightly
            return () => clearTimeout(timer);
        }
    }, [rotation, onDimensionsUpdate, modelData]);

  return (
    <Canvas 
      camera={{ position: [150, 150, 150], fov: 50 }} 
      style={{ background: 'transparent' }} 
      shadows
      gl={{ preserveDrawingBuffer: true }} // Needed for taking screenshots if implemented
    >
      <Suspense fallback={null}>
        <Stage environment="city" intensity={0.6} shadows={{ type: 'contact', opacity: 0.5, blur: 2 }}>
            <Center bottom>
                <group rotation={rotation} ref={groupRef}>
                    {modelUrl && ( // Only render model if URL is present
                         <Model 
                            url={modelUrl} 
                            fileType={fileType} 
                            onGeometryCalculated={handleGeometryCalculated}
                            rotation={rotation}
                            validationResult={validationResult}
                            highlightingEnabled={highlightingEnabled}
                        />
                    )}
                </group>
            </Center>
        </Stage>
      </Suspense>
      <OrbitControls makeDefault />
    </Canvas>
  );
};

export default ThreeDViewer;