Draco decoder WASM files — required by Three.js DRACOLoader.

Copy these files from node_modules/three/examples/jsm/libs/draco/ :

  draco_decoder.js
  draco_decoder.wasm
  draco_wasm_wrapper.js

Or run from the admin-web directory:
  cp node_modules/three/examples/jsm/libs/draco/* src/assets/draco/

The GltfViewerComponent sets DRACOLoader path to 'assets/draco/'.
Without these files, only non-compressed glTF/glb models will load.
