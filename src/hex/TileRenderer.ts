import * as THREE from 'three';
import { HexUtils } from './HexGrid';
import { TileType, TILE_DEFINITIONS } from './TileTypes';

/**
 * TileRenderer
 * 
 * 3D六角形タイルのメッシュを生成
 * 上面と側面で異なる色を適用し、立体感を表現
 */
export class TileRenderer {
    /**
     * タイルメッシュを生成
     * 
     * @param q - Axial座標系のq
     * @param r - Axial座標系のr
     * @param tileType - タイルタイプ
     * @returns 3Dメッシュ
     */
    public createTileMesh(
        q: number,
        r: number,
        tileType: TileType
    ): THREE.Mesh {
        const def = TILE_DEFINITIONS[tileType];
        const { x, z } = HexUtils.axialToWorld(q, r);

        // 六角形の形状を作成
        const shape = new THREE.Shape();
        const vertices = HexUtils.getHexVertices(0, 0, 0.95);

        // 頂点配列の検証
        if (!vertices[0] || !vertices[1]) {
            throw new Error('Failed to generate hex vertices');
        }

        shape.moveTo(vertices[0].x, vertices[0].z);
        for (let i = 1; i < 6; i++) {
            const vertex = vertices[i];
            if (vertex) {
                shape.lineTo(vertex.x, vertex.z);
            }
        }
        shape.closePath();

        // 立体化
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: def.height,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 1
        });

        // マテリアル配列：上面と側面で異なる色を適用して立体感を表現
        const topColor = new THREE.Color(def.color);
        const sideColor = topColor.clone().multiplyScalar(0.6);  // 側面は60%の明るさ

        const materials = [
            new THREE.MeshBasicMaterial({ color: topColor, side: THREE.DoubleSide }),   // 上面（明るめ）
            new THREE.MeshBasicMaterial({ color: sideColor, side: THREE.DoubleSide }), // 側面（暗め）
        ];

        const mesh = new THREE.Mesh(geometry, materials);

        // 地面に水平配置
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, def.height / 2, z);

        return mesh;
    }

    /**
     * メッシュリソースを破棄
     */
    public disposeMesh(mesh: THREE.Mesh): void {
        if (mesh.geometry) {
            mesh.geometry.dispose();
        }
        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => m.dispose());
            } else {
                mesh.material.dispose();
            }
        }
    }
}
