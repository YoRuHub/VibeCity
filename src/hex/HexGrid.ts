import * as THREE from 'three';

/**
 * ヘキサゴン（六角形）の座標計算ユーティリティ
 */
export class HexUtils {
    /**
     * 六角形のサイズ（中心から頂点までの距離）
     */
    static readonly HEX_SIZE = 1;

    /**
     * 六角形の幅（水平方向の距離）
     */
    static readonly HEX_WIDTH = this.HEX_SIZE * Math.sqrt(3);

    /**
     * 六角形の高さ（垂直方向の距離）
     */
    static readonly HEX_HEIGHT = this.HEX_SIZE * 2;

    /**
     * Axial座標からWorld座標への変換
     */
    static axialToWorld(q: number, r: number): { x: number; z: number } {
        const x = this.HEX_WIDTH * (q + r / 2);
        const z = this.HEX_HEIGHT * 0.75 * r;
        return { x, z };
    }

    /**
     * 六角形のメッシュを作成
     */
    static createHexMesh(color: THREE.Color = new THREE.Color(0x444444)): THREE.Mesh {
        const shape = new THREE.Shape();

        // 六角形の頂点を描画（フラットトップ）
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const x = this.HEX_SIZE * Math.cos(angle);
            const y = this.HEX_SIZE * Math.sin(angle);

            if (i === 0) {
                shape.moveTo(x, y);
            } else {
                shape.lineTo(x, y);
            }
        }
        shape.closePath();

        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.7,
            metalness: 0.3,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2; // 水平に配置
        mesh.receiveShadow = true;
        mesh.castShadow = true;

        return mesh;
    }
}

/**
 * ヘキサゴングリッド管理クラス
 */
export class HexGrid {
    private hexes: Map<string, THREE.Mesh> = new Map();
    private group: THREE.Group;

    constructor(radius: number = 10) {
        this.group = new THREE.Group();
        this.generateGrid(radius);
    }

    /**
     * グリッドの生成
     */
    private generateGrid(radius: number): void {
        for (let q = -radius; q <= radius; q++) {
            const r1 = Math.max(-radius, -q - radius);
            const r2 = Math.min(radius, -q + radius);

            for (let r = r1; r <= r2; r++) {
                this.createHex(q, r);
            }
        }
    }

    /**
     * 単一の六角形を作成
     */
    private createHex(q: number, r: number): void {
        const key = `${q},${r}`;
        const { x, z } = HexUtils.axialToWorld(q, r);

        // ランダムな色のバリエーション
        const hue = Math.random() * 360;
        const color = new THREE.Color().setHSL(hue / 360, 0.5, 0.3);

        const hex = HexUtils.createHexMesh(color);
        hex.position.set(x, 0, z);
        hex.userData = { q, r };

        this.hexes.set(key, hex);
        this.group.add(hex);
    }

    /**
     * グリッドのグループを取得
     */
    public getGroup(): THREE.Group {
        return this.group;
    }

    /**
     * 指定座標の六角形を取得
     */
    public getHex(q: number, r: number): THREE.Mesh | undefined {
        return this.hexes.get(`${q},${r}`);
    }

    /**
     * すべての六角形を取得
     */
    public getAllHexes(): THREE.Mesh[] {
        return Array.from(this.hexes.values());
    }
}
