import {PolyScene} from '@polygonjs/polygonjs/dist/src/engine/scene/PolyScene';
import {BaseViewerType} from '@polygonjs/polygonjs/dist/src/engine/viewers/_Base';
import React, {useEffect, useRef} from 'react';
import {suspend} from 'suspend-react';
import {BaseParamType} from '@polygonjs/polygonjs/dist/src/engine/params/_Base';
import {Vector2Param} from '@polygonjs/polygonjs/dist/src/engine/params/Vector2';
import {useThree} from '@react-three/fiber';
import {WebGLRenderer} from 'three';

interface LoadSceneOptions {
	// onProgress?: (progress: number) => void;
	// domElement?: HTMLElement;
	// printWarnings?: boolean;
	renderer: WebGLRenderer;
}
interface LoadedData<S extends PolyScene> {
	scene: S;
	viewer: BaseViewerType | undefined;
}
type LoadScene<S extends PolyScene> = (options: LoadSceneOptions) => Promise<LoadedData<S>>;

type PolygonjsSceneProps<S extends PolyScene, P extends {}> = P & {
	sceneName: string;
	loadFunction: LoadScene<S>;
};

const sceneParamsByScene: Map<PolyScene, Map<string, BaseParamType>> = new Map();

function usePolygonjsLoadScene(
	loadingFunc: LoadScene<PolyScene>,
	sceneName: string,
	renderer: WebGLRenderer
): PolyScene {
	const results = suspend(() => {
		return loadingFunc({renderer});
	}, [sceneName]);
	return results.scene;
}

export const PolygonjsScene = <S extends PolyScene, P extends {}>(props: PolygonjsSceneProps<S, P>) => {
	const {gl} = useThree();
	const group = useRef<THREE.Group>(null!);
	const scene = usePolygonjsLoadScene(props.loadFunction, props.sceneName, gl);
	// it is required to have the renderer for cop/imageEXR and sop/particlesSystemGPU
	scene.renderersRegister.registerRenderer(gl);

	useEffect(() => {
		group.current.add(scene.threejsScene());
	});

	const propNames = Object.keys(props).filter((propName) => {
		const isNotCorePropName = !['sceneName', 'loadFunction'].includes(propName);
		return isNotCorePropName;
	}) as Array<string>;
	useEffect(() => {
		scene.batchUpdates(() => {
			for (let propName of propNames) {
				_updateScene(propName);
			}
		});
	}, [Object.values(props)]);

	function _updateScene(propName: string) {
		let sceneParamsMap = sceneParamsByScene.get(scene);
		if (!sceneParamsMap) {
			sceneParamsMap = new Map();
			sceneParamsByScene.set(scene, sceneParamsMap);
		}

		const param = sceneParamsMap.get(propName) || findParam(propName, scene, sceneParamsMap);
		if (!param) {
			return;
		}
		const propValue = props[propName as keyof PolygonjsSceneProps<S, P>];
		param.set(propValue as any);
	}

	return <group ref={group}></group>;
};

function findParam(propName: string, scene: PolyScene, sceneParamsMap: Map<string, BaseParamType>) {
	const elements = propName.split('--');
	const nodePath = '/' + elements[0].replace(/-/g, '/');
	const node = scene.node(nodePath);
	if (!node) {
		console.warn(`node '${nodePath}' not found`);
		return;
	}
	const paramName = elements[1];
	const paramElements = paramName.split('-');
	let param: BaseParamType | null = null;
	if (paramElements.length === 1) {
		param = node.params.get(paramName);
	} else {
		const parentParam = node.params.get(paramElements[0]);
		const componentName = paramElements[1];
		if (parentParam instanceof Vector2Param) {
			if (componentName === 'x' || componentName === 'y') {
				param = parentParam[componentName];
			}
		}
	}
	if (!param) {
		console.warn(`node '${nodePath}' has no param '${param}'`);
		return;
	}

	sceneParamsMap.set(propName, param);
	return param;
}
