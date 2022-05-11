import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

const packageJson = require('./package.json');

export default [
	{
		input: 'src/index.ts',
		output: [
			{
				file: packageJson.main,
				format: 'cjs',
				sourcemap: true,
			},
			{
				file: packageJson.module,
				format: 'esm',
				sourcemap: true,
			},
		],
		plugins: [resolve(), commonjs(), typescript({tsconfig: './tsconfig.json'})],
	},
	{
		input: 'dist/esm/types/index.d.ts',
		output: [{file: 'dist/index.d.ts', format: 'esm'}],
		//
		// in order to avoid the error
		// "Unhandled Runtime Error Error: Invalid hook call. Hooks can only be called inside of the body of a function component"
		// we set react as external.
		// see https://dev.to/alexeagleson/how-to-create-and-publish-a-react-component-library-2oe
		external: ['react', '@react-three/drei', '@react-three/fiber', '@polygonjs/polygonjs'],
		plugins: [dts()],
	},
];
