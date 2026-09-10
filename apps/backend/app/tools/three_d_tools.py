import json
import logging
from typing import Dict, Any, List, Optional
from app.tools.contracts import ToolDefinition, PermissionTier

logger = logging.getLogger("yash.ai.tools.3d")


async def generate_3d_scene(prompt: str = "", **kwargs) -> Dict[str, Any]:
    """
    Generates a structured 3D scene graph of meshes, transformations, and materials
    from a natural language prompt.
    """
    prompt = prompt.strip()
    if not prompt:
        return {"error": "Prompt must not be empty"}

    prompt_lower = prompt.lower()
    
    # Procedural scene synthesizer based on semantic keywords
    objects: List[Dict[str, Any]] = []

    if any(k in prompt_lower for k in ["ship", "vehicle", "plane", "car", "speeder", "robot"]):
        # Tech vehicle composition
        objects = [
            {
                "id": "mesh_chassis_1",
                "name": "Central Chassis",
                "type": "Cube",
                "position": [0, 0.5, 0],
                "rotation": [0, 0, 0],
                "scale": [3.0, 0.6, 1.4],
                "color": "#1e293b",
                "metalness": 0.85,
                "roughness": 0.25,
                "wireframe": False
            },
            {
                "id": "mesh_cockpit_2",
                "name": "Pilot Canopy",
                "type": "Sphere",
                "position": [0.6, 0.9, 0],
                "rotation": [0, 0, 0],
                "scale": [1.1, 0.5, 0.8],
                "color": "#38bdf8",
                "metalness": 0.9,
                "roughness": 0.1,
                "wireframe": False
            },
            {
                "id": "mesh_thruster_left",
                "name": "Left Ion Thruster",
                "type": "Cylinder",
                "position": [-1.6, 0.5, 0.9],
                "rotation": [0, 0, 1.57],
                "scale": [0.4, 1.2, 0.4],
                "color": "#ef4444",
                "metalness": 0.7,
                "roughness": 0.4,
                "wireframe": True
            },
            {
                "id": "mesh_thruster_right",
                "name": "Right Ion Thruster",
                "type": "Cylinder",
                "position": [-1.6, 0.5, -0.9],
                "rotation": [0, 0, 1.57],
                "scale": [0.4, 1.2, 0.4],
                "color": "#ef4444",
                "metalness": 0.7,
                "roughness": 0.4,
                "wireframe": True
            },
            {
                "id": "mesh_core_halo",
                "name": "Shield Stabilizer Ring",
                "type": "Torus",
                "position": [0, 0.5, 0],
                "rotation": [1.57, 0, 0],
                "scale": [1.8, 1.8, 0.15],
                "color": "#6366f1",
                "metalness": 0.95,
                "roughness": 0.15,
                "wireframe": True
            }
        ]
    elif any(k in prompt_lower for k in ["pedestal", "monument", "tower", "pillar", "sculpture", "building"]):
        # Architectural sculpture
        objects = [
            {
                "id": "mesh_base_slab",
                "name": "Marble Base",
                "type": "Cube",
                "position": [0, 0.2, 0],
                "rotation": [0, 0, 0],
                "scale": [2.5, 0.4, 2.5],
                "color": "#334155",
                "metalness": 0.2,
                "roughness": 0.7,
                "wireframe": False
            },
            {
                "id": "mesh_central_pillar",
                "name": "Monolithic Column",
                "type": "Cylinder",
                "position": [0, 1.8, 0],
                "rotation": [0, 0, 0],
                "scale": [0.7, 2.8, 0.7],
                "color": "#f8fafc",
                "metalness": 0.3,
                "roughness": 0.5,
                "wireframe": False
            },
            {
                "id": "mesh_floating_orb",
                "name": "Levitating Core Orb",
                "type": "Sphere",
                "position": [0, 3.8, 0],
                "rotation": [0, 0, 0],
                "scale": [0.9, 0.9, 0.9],
                "color": "#f59e0b",
                "metalness": 0.9,
                "roughness": 0.1,
                "wireframe": False
            },
            {
                "id": "mesh_orbit_torus",
                "name": "Orbital Ring",
                "type": "Torus",
                "position": [0, 3.8, 0],
                "rotation": [0.78, 0.78, 0],
                "scale": [1.4, 1.4, 0.08],
                "color": "#8b5cf6",
                "metalness": 0.8,
                "roughness": 0.2,
                "wireframe": True
            }
        ]
    else:
        # Balanced geometric art composition
        objects = [
            {
                "id": "mesh_hero_box",
                "name": "Prismatic Foundation",
                "type": "Cube",
                "position": [0, 0.75, 0],
                "rotation": [0, 0.4, 0],
                "scale": [1.5, 1.5, 1.5],
                "color": "#4f46e5",
                "metalness": 0.7,
                "roughness": 0.3,
                "wireframe": False
            },
            {
                "id": "mesh_hero_sphere",
                "name": "Harmonic Sphere",
                "type": "Sphere",
                "position": [0, 2.3, 0],
                "rotation": [0, 0, 0],
                "scale": [0.8, 0.8, 0.8],
                "color": "#06b6d4",
                "metalness": 0.9,
                "roughness": 0.15,
                "wireframe": True
            },
            {
                "id": "mesh_accent_torus",
                "name": "Aura Halo",
                "type": "Torus",
                "position": [0, 2.3, 0],
                "rotation": [1.57, 0, 0],
                "scale": [1.3, 1.3, 0.06],
                "color": "#ec4899",
                "metalness": 0.85,
                "roughness": 0.2,
                "wireframe": False
            }
        ]

    scene_data = {
        "title": prompt[:40],
        "prompt": prompt,
        "object_count": len(objects),
        "objects": objects,
        "camera": {"position": [4.0, 3.0, 5.0], "target": [0, 1.5, 0]},
        "ambient_light": {"color": "#ffffff", "intensity": 0.6},
        "directional_light": {"color": "#ffffff", "intensity": 1.2, "position": [5.0, 10.0, 7.0]}
    }

    return scene_data


async def apply_3d_material(
    object_id: str = "",
    color: Optional[str] = "#6366f1",
    metalness: Optional[float] = 0.5,
    roughness: Optional[float] = 0.5,
    wireframe: Optional[bool] = False,
    **kwargs
) -> Dict[str, Any]:
    """
    Applies material and shader adjustments to a specific 3D mesh object.
    """
    if not object_id:
        return {"error": "object_id is required"}

    color = color or "#6366f1"
    metalness_val = float(metalness if metalness is not None else 0.5)
    roughness_val = float(roughness if roughness is not None else 0.5)
    wireframe_val = bool(wireframe)

    return {
        "object_id": object_id,
        "material": {
            "color": color,
            "metalness": max(0.0, min(1.0, metalness_val)),
            "roughness": max(0.0, min(1.0, roughness_val)),
            "wireframe": wireframe_val
        }
    }



THREE_D_TOOLS = [
    ToolDefinition(
        id="3d.generate_scene",
        name="Generate 3D Scene",
        description="Generates an interactive 3D scene composition (meshes, positions, materials, lighting) from a natural language prompt.",
        category="3d",
        permission_tier=PermissionTier.READ,
        input_schema={
            "type": "object",
            "properties": {
                "prompt": {"type": "string", "description": "Creative description of the 3D scene to generate"}
            },
            "required": ["prompt"]
        },
        output_schema={"type": "object", "properties": {"objects": {"type": "array"}}},
        requires_confirmation=False,
        handler=generate_3d_scene
    ),
    ToolDefinition(
        id="3d.apply_material",
        name="Apply 3D Material",
        description="Applies PBR material properties (color, metalness, roughness, wireframe) to an object in the 3D studio.",
        category="3d",
        permission_tier=PermissionTier.EXECUTE,
        input_schema={
            "type": "object",
            "properties": {
                "object_id": {"type": "string", "description": "Target mesh ID"},
                "color": {"type": "string", "description": "Hex color code e.g. #3b82f6"},
                "metalness": {"type": "number", "description": "Metalness coefficient 0.0 to 1.0"},
                "roughness": {"type": "number", "description": "Roughness coefficient 0.0 to 1.0"},
                "wireframe": {"type": "boolean", "description": "Whether wireframe mode is enabled"}
            },
            "required": ["object_id"]
        },
        output_schema={"type": "object", "properties": {"object_id": {"type": "string"}, "material": {"type": "object"}}},
        requires_confirmation=False,
        handler=apply_3d_material
    )
]

