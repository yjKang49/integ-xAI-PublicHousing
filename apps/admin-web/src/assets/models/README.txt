3D Building Models — glTF / glb format

Convention:
  building-{buildingId}.glb   →  used as fallback when modelUrl query param is absent

Example: building-B001.glb

Mesh naming convention for floor filtering:
  *_1F, *_2F, *_B1    — suffix style  (e.g. "Wall_3F", "Column_B1")
  *Floor1, *Floor2     — prefix style  (e.g. "SlabFloor2")
  Floor 0 = show all floors (no filter)

Recommended mesh structure:
  Scene
  └─ Building_Root
     ├─ Structure_B1   (basement)
     ├─ Structure_1F
     ├─ Structure_2F
     └─ Structure_RF   (roof)

Optimization tips:
  - Export as .glb (binary) rather than .gltf+.bin
  - Use Draco compression for meshes > 1 MB
  - Keep texture sizes ≤ 2048×2048
  - Merge static geometry per floor into single meshes
