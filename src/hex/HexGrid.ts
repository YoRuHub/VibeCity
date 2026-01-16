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
     * Axial座標からWorld座標への変換（フラットトップ）
     */
    static axialToWorld(q: number, r: number): { x: number; z: number } {
        // フラットトップの変換式（修正版）
        const x = this.HEX_SIZE * Math.sqrt(3) * (q + r / 2);
        const z = this.HEX_SIZE * 3 / 2 * r;
        return { x, z };
    }

    /**
     * 六角形の6つの頂点を取得（フラットトップ）
     */
    static getHexVertices(centerX: number, centerZ: number, scale: number = 1.0): THREE.Vector3[] {
        const vertices: THREE.Vector3[] = [];

        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6; // -30度オフセット
            const x = centerX + this.HEX_SIZE * scale * Math.cos(angle);
            const z = centerZ + this.HEX_SIZE * scale * Math.sin(angle);
            vertices.push(new THREE.Vector3(x, 0, z));
        }

        return vertices;
    }

    /**
     * Axial座標間の距離を計算
     */
    static axialDistance(q1: number, r1: number, q2: number, r2: number): number {
        return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(q1 + r1 - q2 - r2)) / 2;
    }
}

/**
 * 六角形の状態を表すインターフェース
 */
interface HexState {
    q: number;
    r: number;
    mesh: THREE.Group;        // グループに変更（外側と内側の線）
    material: THREE.LineBasicMaterial;
    intensity: number;        // 現在の明るさ (0-1)
    targetIntensity: number;  // 目標明るさ (0-1)
}

/**
 * ヘキサゴングリッド管理クラス
 */
export class HexGrid {
    private group: THREE.Group;
    private hexes: Map<string, HexState> = new Map();
    private baseColor = new THREE.Color(0x00ffff);
    private dimmedColor = new THREE.Color(0x008888);

    constructor(radius: number = 30) {
        this.group = new THREE.Group();
        this.generateGrid(radius);
    }

    /**
     * 座標をキーに変換
     */
    private coordToKey(q: number, r: number): string {
        return `${q},${r}`;
    }

    /**
     * グリッド全体を個別LineLoopで生成
     */
    private generateGrid(radius: number): void {
        for (let q = -radius; q <= radius; q++) {
            const r1 = Math.max(-radius, -q - radius);
            const r2 = Math.min(radius, -q + radius);

            for (let r = r1; r <= r2; r++) {
                this.createHex(q, r);
            }
        }

        console.log(`Generated ${this.hexes.size} hexagons`);
    }

    /**
     * 個別の六角形を生成
     */
    /**
     * 個別の六角形を生成
     */
    private createHex(q: number, r: number): void {
        const { x, z } = HexUtils.axialToWorld(q, r);

        // 個別のマテリアル（共有）
        const material = new THREE.LineBasicMaterial({
            color: this.dimmedColor.clone(),
            linewidth: 1,
        });

        // グループ作成
        const group = new THREE.Group();
        group.userData = { q, r };

        // 1. 六角形 (Scale 0.95) - 少し隙間を作る
        const outerVertices = HexUtils.getHexVertices(x, z, 0.95);
        const outerGeometry = new THREE.BufferGeometry().setFromPoints(outerVertices);
        const outerMesh = new THREE.LineLoop(outerGeometry, material);
        group.add(outerMesh);

        // 内側の六角形は不要のため削除

        // 状態を保存
        const key = this.coordToKey(q, r);
        this.hexes.set(key, {
            q,
            r,
            mesh: group,
            material,
            intensity: 0,
            targetIntensity: 0,
        });

        this.group.add(group);
    }

    /**
     * 六角形の明るさを更新
     */
    public updateHexIntensity(q: number, r: number, intensity: number): void {
        const key = this.coordToKey(q, r);
        const hex = this.hexes.get(key);
        if (!hex) return;

        hex.targetIntensity = Math.max(0, Math.min(1, intensity));
    }

    /**
     * フレームごとの更新処理（スムーズな遷移）
     */
    public update(deltaTime: number): void {
        const lerpSpeed = 10.0; // 遷移速度

        this.hexes.forEach((hex) => {
            // 強度が実質0の場合はスキップ（パフォーマンス最適化）
            if (hex.intensity < 0.001 && hex.targetIntensity < 0.001) {
                hex.material.color.copy(this.dimmedColor);
                return;
            }

            // 現在の明るさを目標に近づける
            hex.intensity += (hex.targetIntensity - hex.intensity) * lerpSpeed * deltaTime;

            // 色を更新（強度を1.5倍に調整）
            const boostedIntensity = Math.min(1.0, hex.intensity * 1.5);
            hex.material.color.lerpColors(
                this.dimmedColor,
                this.baseColor,
                boostedIntensity
            );
        });
    }

    /**
     * 指定座標の六角形を取得
     */
    public getHexAt(q: number, r: number): HexState | undefined {
        const key = this.coordToKey(q, r);
        return this.hexes.get(key);
    }

    /**
     * グリッドのグループを取得
     */
    public getGroup(): THREE.Group {
        return this.group;
    }

    /**
     * すべての六角形を取得
     */
    public getAllHexes(): THREE.Object3D[] {
        return Array.from(this.hexes.values()).map(hex => hex.mesh);
    }

    /**
     * すべての六角形の状態を取得
     */
    public getAllHexStates(): HexState[] {
        return Array.from(this.hexes.values());
    }
}
