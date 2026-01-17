import * as THREE from 'three';
import { TileType } from './TileTypes';
import { TileRenderer } from './TileRenderer';

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

    /**
     * World座標からAxial座標への変換（フラットトップ）
     */
    static worldToAxial(x: number, z: number): { q: number; r: number } {
        const q = (x * Math.sqrt(3) / 3 - z / 3) / this.HEX_SIZE;
        const r = (z * 2 / 3) / this.HEX_SIZE;
        return this.axialRound(q, r);
    }

    /**
     * Axial座標の丸め処理
     */
    static axialRound(q: number, r: number): { q: number; r: number } {
        let x = q;
        let z = r;
        let y = -x - z;

        let rx = Math.round(x);
        let rz = Math.round(z);
        let ry = Math.round(y);

        const xDiff = Math.abs(rx - x);
        const yDiff = Math.abs(ry - y);
        const zDiff = Math.abs(rz - z);

        if (xDiff > yDiff && xDiff > zDiff) {
            rx = -ry - rz;
        } else if (yDiff > zDiff) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }

        return { q: rx, r: rz };
    }
}

/**
 * 六角形の状態を表すインターフェース
 */
interface HexState {
    /** Axial座標系のq座標 */
    q: number;
    /** Axial座標系のr座標 */
    r: number;
    /** 現在の明るさ (0.0 = ベース色, 1.0+ = 発光オーバードライブ) */
    intensity: number;
    /** 目標明るさ（補間ターゲット値） */
    targetIntensity: number;
    /** 頂点カラーバッファ内の開始頂点インデックス（12頂点/hex） */
    colorIndex: number;

    // === タイル配置システム ===
    /** 配置されているタイルの種類 */
    tileType: TileType;
    /** タイル用の3Dメッシュ（null = 空タイル） */
    tileMesh: THREE.Mesh | null;
}

/**
 * 波動情報の管理
 */
interface Wave {
    /** 波の発生源のq座標 */
    q: number;
    /** 波の発生源のr座標 */
    r: number;
    /** 波の発生時刻（秒単位） */
    startTime: number;
    /** 波の伝播速度（ヘックス/秒） */
    speed: number;
    /** 波の幅（ヘックス数単位、この範囲内で発光） */
    width: number;
    /** 減衰率（未使用、将来の拡張用） */
    decay: number;
}

/**
 * ヘキサゴングリッド管理クラス
 * 
 * パフォーマンス最適化:
 * - Single BufferGeometry: 全ヘックスを1つのジオメトリに統合
 * - Vertex Colors: シェーダー不要で色変更可能
 * - Active Tracking: 変更が必要なヘックスのみ更新
 */
export class HexGrid {
    private group: THREE.Group;

    /** 全ヘックスの状態管理（キー: "q,r"） */
    private hexes: Map<string, HexState> = new Map();

    /** 更新が必要なヘックスのキーを追跡（パフォーマンス最適化） */
    private activeHexes: Set<string> = new Set();

    // 単一のメッシュとジオメトリ（最適化）
    private mesh: THREE.LineSegments | null = null;
    private geometry: THREE.BufferGeometry | null = null;

    /** ベース状態のヘックス色（暗めのCyan） */
    private baseHexColor = new THREE.Color(0x22aadd);
    /** アクティブ状態のヘックス色（明るいCyan、発光用） */
    private activeHexColor = new THREE.Color(0x00ffff);

    /** 伝播中の波のリスト */
    private waves: Wave[] = [];
    /** 現在ホバー中のヘックス座標 */
    private hoveredHex: { q: number, r: number } | null = null;

    /** タイルメッシュレンダラー */
    private tileRenderer: TileRenderer;

    constructor(radius: number = 30) {
        this.group = new THREE.Group();
        this.tileRenderer = new TileRenderer();
        this.generateGrid(radius);
    }



    /**
     * 座標をキーに変換
     */
    private coordToKey(q: number, r: number): string {
        return `${q},${r}`;
    }

    /**
     * グリッド全体を生成 (最適化: バッチ描画)
     */
    private generateGrid(radius: number): void {
        const positions: number[] = [];
        const colors: number[] = [];
        let index = 0;

        // グリッドを走査
        for (let q = -radius; q <= radius; q++) {
            const r1 = Math.max(-radius, -q - radius);
            const r2 = Math.min(radius, -q + radius);

            for (let r = r1; r <= r2; r++) {
                const { x, z } = HexUtils.axialToWorld(q, r);

                // 頂点の取得 (Scale 0.95)
                const vertices = HexUtils.getHexVertices(x, z, 0.95);

                // LineSegments用に頂点ペアを作成 (0-1, 1-2, ..., 5-0)
                for (let i = 0; i < 6; i++) {
                    const v1 = vertices[i];
                    const v2 = vertices[(i + 1) % 6];

                    if (v1 && v2) {
                        positions.push(v1.x, 0, v1.z);
                        positions.push(v2.x, 0, v2.z);

                        // 初期色 (Base Color)
                        colors.push(this.baseHexColor.r, this.baseHexColor.g, this.baseHexColor.b);
                        colors.push(this.baseHexColor.r, this.baseHexColor.g, this.baseHexColor.b);
                    }
                }

                // 状態を保存
                const key = this.coordToKey(q, r);
                this.hexes.set(key, {
                    q,
                    r,
                    intensity: 0,
                    targetIntensity: 0,
                    colorIndex: index,
                    tileType: TileType.Empty,  // 初期状態は空タイル
                    tileMesh: null
                });

                // 次のヘックスのインデックス (1ヘックスあたり12頂点 * 3要素)
                // colorIndexは「頂点数」単位で管理すると更新が楽 (12頂点)
                index += 12;
            }
        }

        // ジオメトリの作成
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        // マテリアルの作成 (Vertex Colorsを使用)
        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            linewidth: 1,
            transparent: false, // 透明化無効（パフォーマンス向上）
            blending: THREE.NormalBlending // 通常合成
        });

        this.mesh = new THREE.LineSegments(this.geometry, material);
        this.group.add(this.mesh);

        console.log(`Generated optimized grid with ${this.hexes.size} hexagons`);
    }

    /**
     * 六角形の明るさを更新
     * 
     * @param q - Axial座標のq
     * @param r - Axial座標のr
     * @param intensity - 目標明るさ（0.0～1.0、ただしクランプされる）
     */
    public updateHexIntensity(q: number, r: number, intensity: number): void {
        const key = this.coordToKey(q, r);
        const hex = this.hexes.get(key);
        if (!hex) return;

        hex.targetIntensity = Math.max(0, Math.min(1, intensity));

        // アクティブリストに追加（更新対象として追跡）
        this.activeHexes.add(key);
    }

    /**
     * ホバー状態を設定
     */
    public setHover(q: number, r: number): void {
        // 同じヘックスなら何もしない
        if (this.hoveredHex && this.hoveredHex.q === q && this.hoveredHex.r === r) return;

        // 前のホバーを解除
        if (this.hoveredHex) {
            this.updateHexIntensity(this.hoveredHex.q, this.hoveredHex.r, 0);
        }

        // 新しいホバーを設定
        const key = this.coordToKey(q, r);
        if (this.hexes.has(key)) {
            this.hoveredHex = { q, r };
            this.updateHexIntensity(q, r, 1.0); // Cyanにする
        } else {
            this.hoveredHex = null; // グリッド外
        }
    }

    /**
     * 波及エフェクトをトリガー
     * 
     * 指定座標から同心円状に広がる波を発生させる。
     * 波は一定速度で伝播し、範囲内のヘックスを発光させる。
     * 
     * @param q - 波の発生源のq座標
     * @param r - 波の発生源のr座標
     */
    public triggerWave(q: number, r: number): void {
        this.waves.push({
            q,
            r,
            startTime: performance.now() / 1000,
            speed: 25.0,  // 伝播速度（ヘックス/秒）
            width: 1.5,   // 波の幅（ヘックス数）
            decay: 0.9    // 減衰率（未使用）
        });

        // 古い波を削除（上限管理: 最大5波まで同時表示）
        if (this.waves.length > 5) {
            this.waves.shift();
        }
    }

    /**
     * フレームごとの更新処理
     * 
     * パフォーマンス最適化:
     * - アクティブなヘックスのみ更新（全体走査を回避）
     * - 波の影響範囲を事前計算
     * - 不要になったヘックスをアクティブリストから削除
     * 
     * @param deltaTime - 前フレームからの経過時間（秒）
     */
    public update(deltaTime: number): void {
        if (!this.geometry || !this.mesh) return;

        const currentTime = performance.now() / 1000;
        const lerpSpeed = 5.0;

        // カラー属性へのアクセス
        // @ts-ignore
        const colorAttribute = this.geometry.attributes.color as THREE.BufferAttribute;
        let needsUpdate = false;

        // 波の更新とクリーンアップ（GC発生を抑えるため filter ではなく逆順ループで処理）
        for (let i = this.waves.length - 1; i >= 0; i--) {
            const wave = this.waves[i];
            if (!wave) continue;

            const age = currentTime - wave.startTime;
            const distance = age * wave.speed;

            // 波の最大到達距離（6ヘックス）を超えたら削除
            if (distance >= 6) {
                this.waves.splice(i, 1);
            }
        }

        // 波の影響を受けるヘックスをアクティブリストに追加
        for (const wave of this.waves) {
            const age = currentTime - wave.startTime;
            const waveDist = age * wave.speed;

            // 波の中心から影響範囲内のヘックスを計算
            // 最大6ヘックス + 波の幅を考慮
            const maxRadius = Math.ceil(waveDist + wave.width);

            // 波の近傍のヘックスのみをアクティブ化
            for (const [key, hex] of this.hexes) {
                const dist = HexUtils.axialDistance(hex.q, hex.r, wave.q, wave.r);
                if (dist <= maxRadius && dist >= waveDist - wave.width) {
                    this.activeHexes.add(key);
                }
            }
        }

        // アクティブなヘックスのみ更新（パフォーマンス最適化）
        for (const key of this.activeHexes) {
            const hex = this.hexes.get(key);
            if (!hex) {
                // 存在しないキーは削除
                this.activeHexes.delete(key);
                continue;
            }

            let waveIntensity = 0;

            // 各波からの影響を計算
            for (const wave of this.waves) {
                const dist = HexUtils.axialDistance(hex.q, hex.r, wave.q, wave.r);

                // 波の範囲外（6HEX以上）なら計算しない
                if (dist > 6) continue;

                const age = currentTime - wave.startTime;
                const waveDist = age * wave.speed;

                // 波のピークとの距離
                const diff = Math.abs(dist - waveDist);

                if (diff < wave.width) {
                    // ガウス関数的な減衰
                    const v = 1.0 - (diff / wave.width);
                    waveIntensity += Math.pow(v, 3) * 2.0; // 控えめに発光（ドラッグ時も考慮）
                }
            }

            // 波の累積強度を制限（ドラッグ時に複数波が重なっても一定の明るさを保つ）
            waveIntensity = Math.min(waveIntensity, 1.0);

            // ベースのターゲット強度（上限撤廃してBloomさせる）
            const target = hex.targetIntensity + waveIntensity;

            // 現在の明るさを目標に近づける (変化があれば更新)
            if (Math.abs(hex.intensity - target) > 0.001 || hex.intensity > 0.001) {
                hex.intensity += (target - hex.intensity) * lerpSpeed * deltaTime;

                // 色を計算
                let r, g, b;

                // 強度が1.0を超える場合は「オーバードライブ」として発光強度をブースト
                // これにより、Bloomフィルターが反応して強く光る
                if (hex.intensity > 1.0) {
                    const boost = hex.intensity; // そのまま倍率に
                    r = this.activeHexColor.r * boost;
                    g = this.activeHexColor.g * boost;
                    b = this.activeHexColor.b * boost;
                } else {
                    // 通常の補間
                    r = THREE.MathUtils.lerp(this.baseHexColor.r, this.activeHexColor.r, hex.intensity);
                    g = THREE.MathUtils.lerp(this.baseHexColor.g, this.activeHexColor.g, hex.intensity);
                    b = THREE.MathUtils.lerp(this.baseHexColor.b, this.activeHexColor.b, hex.intensity);
                }

                // 頂点カラーを一括更新 (12頂点分)
                for (let i = 0; i < 12; i++) {
                    colorAttribute.setXYZ(hex.colorIndex + i, r, g, b);
                }

                needsUpdate = true;
            } else {
                // 変化がなく、十分に暗い場合はアクティブリストから削除
                if (Math.abs(hex.intensity) < 0.001 && Math.abs(hex.targetIntensity) < 0.001) {
                    this.activeHexes.delete(key);
                }
            }
        }

        if (needsUpdate) {
            colorAttribute.needsUpdate = true;
        }
    }

    /**
     * 指定座標にタイルを配置
     * 
     * 既存のタイルメッシュを削除し、新しいタイプのタイルを生成して配置する。
     * TileType.Emptyを指定した場合はタイルを削除（空に戻す）。
     * 
     * @param q - Axial座標系のq座標
     * @param r - Axial座標系のr座標
     * @param type - 配置するタイルの種類
     */
    public placeTile(q: number, r: number, type: TileType): void {
        const key = this.coordToKey(q, r);
        const hex = this.hexes.get(key);
        if (!hex) return;

        // 既存タイルを削除
        if (hex.tileMesh) {
            this.group.remove(hex.tileMesh);
            this.tileRenderer.disposeMesh(hex.tileMesh);
            hex.tileMesh = null;
        }

        // 新しいタイルを生成（Emptyでない場合のみ）
        if (type !== TileType.Empty) {
            hex.tileMesh = this.tileRenderer.createTileMesh(q, r, type);
            this.group.add(hex.tileMesh);
        }

        hex.tileType = type;
    }

    /**
     * 指定座標の六角形を取得
     */
    public getHexAt(q: number, r: number): HexState | undefined {
        const key = this.coordToKey(q, r);
        return this.hexes.get(key);
    }

    /**
     * グループを取得（Sceneに追加用）
     */
    public getGroup(): THREE.Group {
        return this.group;
    }

    /**
     * すべての六角形を取得
     */
    public getAllHexes(): THREE.Object3D[] {
        // 最適化後はMeshが1つだけなので、Raycasterでの個別判定は不可。
        // InteractionはPlane計算方式に移行したため、これは使用されないはず。
        return this.mesh ? [this.mesh] : [];
    }

    /**
     * すべての六角形の状態を取得
     */
    public getAllHexStates(): HexState[] {
        return Array.from(this.hexes.values());
    }
}
