import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// @ts-ignore
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
// @ts-ignore
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
// @ts-ignore
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
// @ts-ignore
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
// @ts-ignore
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

/**
 * シーン管理クラス
 * Three.jsのシーン、カメラ、レンダラー、ライトを一元管理
 */
export class Scene {
    public scene: any; // THREE.Scene
    public camera: any; // THREE.PerspectiveCamera
    public renderer: any; // THREE.WebGLRenderer
    public controls: any; // OrbitControls
    public composer: any; // EffectComposer
    private fxaaPass: any; // ShaderPass

    private ambientLight!: any; // THREE.AmbientLight
    private sunLight!: any; // THREE.PointLight - 太陽の光

    private animationId: number | null = null;

    // 天動説世界の要素
    private ground!: any; // THREE.Mesh - 中心の大地（円形平面）
    private skyDome!: any; // THREE.Mesh - 天球ドーム
    private sun!: any; // THREE.Mesh - 太陽
    private moon!: any; // THREE.Mesh - 月
    private moonLight!: any; // THREE.PointLight - 月の光
    private stars!: any; // THREE.Points - 星

    // 時間帯ごとの色設定（現実世界に近い色）
    private readonly timeColors = {
        night: {  // 深夜 0-4時
            sky: new THREE.Color(0x0a1929),
            ground: new THREE.Color(0x1a3a4a),
            light: new THREE.Color(0x6688aa),
            ambient: new THREE.Color(0x202844),
            fog: new THREE.Color(0x0a1929),
            sunIntensity: 0.0,
            ambientIntensity: 0.1
        },
        dawn: {  // 夜明け 4-6時
            sky: new THREE.Color(0xffcda2),  // 淡いピーチ色 (赤みを抑える)
            ground: new THREE.Color(0x4a5a6a),
            light: new THREE.Color(0xffeeb0),
            ambient: new THREE.Color(0x7a8a9a),
            fog: new THREE.Color(0xffcda2),
            sunIntensity: 0.3,
            ambientIntensity: 0.2
        },
        morning: {  // 朝 6-10時
            sky: new THREE.Color(0x87ceeb),  // 明るい青空
            ground: new THREE.Color(0x5dbcd2),
            light: new THREE.Color(0xfff8dc),
            ambient: new THREE.Color(0xb0d8e8),
            fog: new THREE.Color(0xa8d8f0),
            sunIntensity: 0.8,
            ambientIntensity: 0.4
        },
        day: {  // 昼 10-16時
            sky: new THREE.Color(0x5eb3e4),  // 鮮やかな青
            ground: new THREE.Color(0x5dbcd2),
            light: new THREE.Color(0xffffff),
            ambient: new THREE.Color(0xc0e0f0),
            fog: new THREE.Color(0x7ac8e8),
            sunIntensity: 1.0,
            ambientIntensity: 0.5
        },
        evening: {  // 夕方 16-19時
            sky: new THREE.Color(0xff9866),  // 夕焼けオレンジ
            ground: new THREE.Color(0x4a6a7a),
            light: new THREE.Color(0xffb080),
            ambient: new THREE.Color(0xc08860),
            fog: new THREE.Color(0xffa880),
            sunIntensity: 0.7,
            ambientIntensity: 0.3
        },
        dusk: {  // 夕暮れ 19-21時
            sky: new THREE.Color(0x4a5a8a),  // 薄暗い青紫
            ground: new THREE.Color(0x2a3a5a),
            light: new THREE.Color(0x8888cc),
            ambient: new THREE.Color(0x404860),
            fog: new THREE.Color(0x4a5a8a),
            sunIntensity: 0.2,
            ambientIntensity: 0.15
        }
    };

    constructor(container: HTMLElement) {
        // シーンの初期化
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x5eb3e4);  // 鮮やかな青空
        this.scene.fog = new THREE.Fog(0x5eb3e4, 50, 500);

        // カメラの初期化（HexArtスタイル）
        this.camera = new THREE.PerspectiveCamera(
            50,  // HexArtと同じFOV
            window.innerWidth / window.innerHeight,
            0.1,
            3000
        );
        this.camera.position.set(0, 5, 15);  // 低い位置から水平に近く
        this.camera.lookAt(0, 0, 0);

        // レンダラーの初期化
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;  // 明るく
        container.appendChild(this.renderer.domElement);

        // OrbitControlsの初期化
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.05; // 地平線近くまで下げられるように（天を見上げるため）
        this.controls.minDistance = 5;
        this.controls.maxDistance = 100;

        // ライトの初期化
        this.setupLights();

        // 地平面の追加
        this.createGroundPlane();

        // ポストプロセッシングの初期化
        this.composer = this.setupPostProcessing();

        // 初期時間を夜に設定（デフォルト）
        this.setTime(22);

        // リサイズハンドラの登録
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    /**
     * ライトのセットアップ
     */
    private setupLights(): void {
        // 環境光を強化（PBRマテリアル用）
        // タイルが太陽光と環境光で適切に照らされるように強度を上げる
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(this.ambientLight);
    }

    /**
     * 中心の大地を作成（円形の平面）
     */
    private createGroundPlane(): void {
        const geometry = new THREE.CircleGeometry(200, 128);
        // ライティングの影響を受けないMeshBasicMaterialに変更して明るさを確保
        const material = new THREE.MeshBasicMaterial({
            color: 0x5dbcd2,  // シアン色
        });

        this.ground = new THREE.Mesh(geometry, material);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -0.1; // グリッド(Y=0)との干渉を防ぐため少し下げる

        this.scene.add(this.ground);

        // 天球ドームの作成
        this.createSkyDome();

        // 太陽の作成
        this.createSun();
    }

    /**
     * 天球ドームを作成
     */
    private createSkyDome(): void {
        const geometry = new THREE.SphereGeometry(500, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({
            color: 0x5eb3e4,  // 青空
            side: THREE.BackSide,
            fog: false
        });

        this.skyDome = new THREE.Mesh(geometry, material);
        this.skyDome.position.y = 0;
        this.scene.add(this.skyDome);
    }

    /**
     * 太陽を作成（スタイライズド・シェーダー）
     * ユーザー要望の「パステルグリーンのコア＋白い発光」を再現
     */
    private createSun(): void {
        // ビルボード用の平面ジオメトリ
        const geometry = new THREE.PlaneGeometry(60, 60);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                coreColor: { value: new THREE.Color(0xA2D9D3) }, // ミントグリーン (画像参照)
                haloColor: { value: new THREE.Color(0xFFFFFF) }  // 純白のハロー
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 coreColor;
                uniform vec3 haloColor;
                varying vec2 vUv;

                void main() {
                    // 中心からの距離 (0.0 - 1.0)
                    vec2 center = vUv * 2.0 - 1.0;
                    float dist = length(center);
                    
                    // コアの半径 (中心の少し小さい円)
                    float coreRadius = 0.35;
                    float coreEdge = 0.005; // エッジを極端に鋭くして「円盤」感を出す

                    // コアのマスク (内側が1.0, エッジで0.0)
                    float coreMask = 1.0 - smoothstep(coreRadius, coreRadius + coreEdge, dist);

                    // ハロー（光輪）
                    // コアの外側から発光
                    float haloIntensity = smoothstep(1.0, coreRadius, dist); 
                    haloIntensity = pow(haloIntensity, 4.0); // 減衰を強く（周囲に広がりすぎないように）

                    // 【重要】合成ロジックの修正
                    // コアがある場所は「コアの色」のみを表示（加算しない）ことで白飛びを防ぐ
                    // コアがない場所はハローを表示
                    
                    vec3 finalColor = coreColor;
                    
                    if (dist > coreRadius) {
                        finalColor = haloColor * haloIntensity; // 外側はハローのみ
                    } else {
                         // コア内部。少しだけハローを混ぜるが、ベースはCoreColor
                         // ミントグリーンを維持するため、加算は最小限に
                         finalColor = mix(coreColor, haloColor, 0.1); 
                    }

                    // アルファチャンネル
                    float alpha = max(coreMask, haloIntensity);
                    
                    // エッジカット
                    if (alpha < 0.01) discard;

                    // ブルーム対策:
                    // コア部分の輝度が1.0を超えないように制御（ToneMappingが効くように）
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            fog: false,
            toneMapped: false, // ToneMappingをOFFにして色を維持するが、輝度は抑える
            depthWrite: false,
            blending: THREE.NormalBlending // NormalBlendingでしっかりと色を塗る
        });

        this.sun = new THREE.Mesh(geometry, material);
        this.sun.position.set(0, -100, -200);


        // 光源を強化（タイルのPBRマテリアルがしっかり照らされるように）
        this.sunLight = new THREE.PointLight(0xffffee, 2.0, 2000);
        this.sunLight.castShadow = true;
        this.sun.add(this.sunLight);

        this.scene.add(this.sun);

        // 月の作成
        this.createMoon();

        // 星の作成
        this.createStars();
    }

    /**
     * 月を作成（カスタムシェーダー）
     */
    private createMoon(): void {
        const geometry = new THREE.SphereGeometry(18, 32, 32);

        // プロシージャルな月シェーダー（リアルで明るい）
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                baseColor: { value: new THREE.Color(0xaaaaaa) }, // ベースをグレーに（白すぎない）
                darkColor: { value: new THREE.Color(0x333333) }  // 暗部をしっかり暗く
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;
                void main() {
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 baseColor;
                uniform vec3 darkColor;
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vPosition;

                // 簡易ノイズ関数
                float rand(vec2 n) { 
                    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
                }

                float noise(vec2 p) {
                    vec2 ip = floor(p);
                    vec2 u = fract(p);
                    u = u*u*(3.0-2.0*u);
                    float res = mix(
                        mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),
                        mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y);
                    return res*res;
                }

                float fbm(vec2 x) {
                    float v = 0.0;
                    float a = 0.5;
                    vec2 shift = vec2(100.0);
                    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
                    for (int i = 0; i < 5; ++i) {
                        v += a * noise(x);
                        x = rot * x * 2.0 + shift;
                        a *= 0.5;
                    }
                    return v;
                }

                void main() {
                    // ノイズ生成
                    float n = fbm(vUv * 10.0 + vec2(1.0, 2.0)); 
                    
                    vec3 col = mix(baseColor, darkColor, n * 0.7); // コントラストを上げる
                    
                    // 輝度を大幅に下げる（反射光としての月）
                    col *= 0.6; 

                    // リムライト（控えめに）
                    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
                    col += vec3(0.2) * pow(rim, 3.0);

                    gl_FragColor = vec4(col, 1.0);
                }
            `,
            fog: false,  // 霧の影響は受けない（クリアに見せる）
            toneMapped: true // トーンマッピング有効化（白飛び防止）
        });

        this.moon = new THREE.Mesh(geometry, material);

        // 月の光
        this.moonLight = new THREE.PointLight(0xddeeff, 0.4, 1500);
        this.moonLight.castShadow = true;
        this.moon.add(this.moonLight);

        this.scene.add(this.moon);
    }

    /**
     * 星を作成（カスタムシェーダー）
     */
    private createStars(): void {
        const starCount = 2000;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI / 2;
            const radius = 480;

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.cos(phi);
            positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

            // ランダムな色（白〜青白〜黄白）
            const colorVariation = Math.random();
            if (colorVariation < 0.7) {
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 1.0;
                colors[i * 3 + 2] = 1.0;
            } else if (colorVariation < 0.85) {
                colors[i * 3] = 0.9;
                colors[i * 3 + 1] = 0.95;
                colors[i * 3 + 2] = 1.0;
            } else {
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.95;
                colors[i * 3 + 2] = 0.85;
            }

            // ランダムなサイズ
            sizes[i] = Math.random() * 3 + 2;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // カスタムシェーダー
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float time;
                
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    
                    // キラキラ効果
                    float twinkle = sin(time * 2.0 + position.x * 0.01) * 0.3 + 0.7;
                    gl_PointSize = size * twinkle;
                    
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    // 円形グラデーション
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    
                    // 滑らかなグラデーション
                    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                    alpha = pow(alpha, 2.0);
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);
    }

    /**
     * 時間に応じたシーンの更新
     * @param time 0.0 - 24.0
     */
    public setTime(time: number): void {
        let fromColor, toColor, lerpFactor;

        // 時間帯判定と補間係数の計算（6段階に細分化）
        if (time >= 0 && time < 4) {
            // 深夜 (0-4)
            fromColor = this.timeColors.night;
            toColor = this.timeColors.night;
            lerpFactor = 0;
        } else if (time >= 4 && time < 6) {
            // 明け方 (4-6)
            fromColor = this.timeColors.night;
            toColor = this.timeColors.dawn;
            lerpFactor = (time - 4) / 2;
        } else if (time >= 6 && time < 8) {
            // 朝焼け (6-8)
            fromColor = this.timeColors.dawn;
            toColor = this.timeColors.morning;
            lerpFactor = (time - 6) / 2;
        } else if (time >= 8 && time < 10) {
            // 朝から昼へ (8-10)
            fromColor = this.timeColors.morning;
            toColor = this.timeColors.day;
            lerpFactor = (time - 8) / 2;
        } else if (time >= 10 && time < 16) {
            // 昼 (10-16)
            fromColor = this.timeColors.day;
            toColor = this.timeColors.day;
            lerpFactor = 0;
        } else if (time >= 16 && time < 18) {
            // 昼から夕方へ (16-18)
            fromColor = this.timeColors.day;
            toColor = this.timeColors.evening;
            lerpFactor = (time - 16) / 2;
        } else if (time >= 18 && time < 20) {
            // 夕暮れ (18-20)
            fromColor = this.timeColors.evening;
            toColor = this.timeColors.dusk;
            lerpFactor = (time - 18) / 2;
        } else {
            // 夜 (20-24)
            fromColor = this.timeColors.dusk;
            toColor = this.timeColors.night;
            lerpFactor = (time - 20) / 4;
        }

        // 補間処理
        if (this.scene.background instanceof THREE.Color) {
            this.scene.background.lerpColors(fromColor.sky, toColor.sky, lerpFactor);
        }
        if (this.scene.fog instanceof THREE.Fog) {
            this.scene.fog.color.lerpColors(fromColor.fog, toColor.fog, lerpFactor);
        }

        this.ambientLight.color.lerpColors(fromColor.ambient, toColor.ambient, lerpFactor);
        this.ambientLight.intensity = this.lerp(fromColor.ambientIntensity, toColor.ambientIntensity, lerpFactor);

        // 太陽の光の色と強度を更新
        if (this.sunLight) {
            this.sunLight.color.lerpColors(fromColor.light, toColor.light, lerpFactor);
            this.sunLight.intensity = this.lerp(fromColor.sunIntensity, toColor.sunIntensity, lerpFactor) * 2;
        }

        // 地面の色を更新
        if (this.ground && this.ground.material) {
            this.ground.material.color.lerpColors(fromColor.ground, toColor.ground, lerpFactor);
        }

        // 天球ドームの色を更新
        if (this.skyDome && this.skyDome.material) {
            this.skyDome.material.color.lerpColors(fromColor.sky, toColor.sky, lerpFactor);
        }

        // 太陽を軌道上で移動（HexArtスタイル）
        if (this.sun) {
            const sunAngle = (time / 24) * Math.PI * 2 - Math.PI / 2;
            const sunRadius = 300;

            this.sun.position.set(
                Math.cos(sunAngle) * sunRadius,
                Math.sin(sunAngle) * sunRadius,
                -50
            );

            // 地平線より上にあるときだけ表示
            this.sun.visible = this.sun.position.y > 0;
        }

        // 月を軌道上で移動（太陽の反対側）
        if (this.moon) {
            const moonAngle = (time / 24) * Math.PI * 2 - Math.PI / 2 + Math.PI;
            const moonRadius = 320;

            this.moon.position.set(
                Math.cos(moonAngle) * moonRadius,
                Math.sin(moonAngle) * moonRadius,
                -50
            );

            // 地平線より上にあるときだけ表示
            this.moon.visible = this.moon.position.y > 0;
        }

        // 星の表示制御（夜のみ）
        if (this.stars) {
            this.stars.visible = time < 6 || time >= 18;
            // 夕方から夜にかけて徐々に明るく
            if (time >= 18 && time < 20) {
                const starFade = (time - 18) / 2;
                this.stars.material.opacity = starFade;
            } else if (time >= 4 && time < 6) {
                const starFade = 1 - (time - 4) / 2;
                this.stars.material.opacity = starFade;
            } else if (time >= 20 || time < 4) {
                this.stars.material.opacity = 1;
            }
            this.stars.material.transparent = true;
        }
    }

    private lerp(v0: number, v1: number, t: number): number {
        return v0 * (1 - t) + v1 * t;
    }

    /**
     * ポストプロセッシングのセットアップ
     */
    private setupPostProcessing(): any {
        // MSAA (Multisample Anti-Aliasing) を有効化するためのレンダーターゲット
        const renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: THREE.HalfFloatType, // 高品質なカラー
                samples: 4 // MSAA 4x (干渉縞・ノイズ対策)
            }
        );

        const composer = new EffectComposer(this.renderer, renderTarget);

        const renderPass = new RenderPass(this.scene, this.camera);
        composer.addPass(renderPass);

        // Bloom効果（太陽のグロー用）
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,   // strength - 強いグロー
            0.8,   // radius - 広く
            0.7    // threshold - 太陽だけ輝く
        );
        composer.addPass(bloomPass);

        // FXAA (Fast Approximate Anti-Aliasing) - ジャギー・モアレ低減の決定版
        const effectFXAA = new ShaderPass(FXAAShader);
        const pixelRatio = this.renderer.getPixelRatio();
        if (effectFXAA.uniforms['resolution']) {
            effectFXAA.uniforms['resolution'].value.set(1 / (window.innerWidth * pixelRatio), 1 / (window.innerHeight * pixelRatio));
        }
        composer.addPass(effectFXAA);
        this.fxaaPass = effectFXAA; // リサイズ用に保持

        return composer;
    }

    /**
     * リサイズハンドラ
     */
    private handleResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);

        if (this.fxaaPass) {
            const pixelRatio = this.renderer.getPixelRatio();
            this.fxaaPass.uniforms['resolution'].value.set(1 / (window.innerWidth * pixelRatio), 1 / (window.innerHeight * pixelRatio));
        }
    }

    private lastTime = performance.now();
    private animationCallback: ((deltaTime: number) => void) | null = null;

    /**
     * アニメーションループ
     */
    private animate = (): void => {
        this.animationId = requestAnimationFrame(this.animate);

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // 太陽のビルボード処理（常にカメラを向く）
        if (this.sun && this.camera) {
            this.sun.quaternion.copy(this.camera.quaternion);
        }

        // シェーダーの時間更新
        if (this.moon && this.moon.material.uniforms) {
            this.moon.material.uniforms.time.value += deltaTime;
        }
        if (this.sun && this.sun.material.uniforms) {
            this.sun.material.uniforms.time.value += deltaTime;
        }

        // コールバック実行
        if (this.animationCallback) {
            this.animationCallback(deltaTime);
        }

        // 星のキラキラアニメーション
        if (this.stars && this.stars.material.uniforms && this.stars.material.uniforms.time) {
            this.stars.material.uniforms.time.value = performance.now() * 0.001;
        }

        // 月のシェーダー更新
        if (this.moon && this.moon.material.uniforms && this.moon.material.uniforms.time) {
            this.moon.material.uniforms.time.value = performance.now() * 0.001;
        }

        // コントロールの更新
        this.controls.update();

        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * アニメーションループの開始
     */
    public startAnimation(callback: (deltaTime: number) => void): void {
        this.animationCallback = callback;
        this.animate();
    }

    /**
     * アニメーションループの停止
     */
    public stopAnimation(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * クリーンアップ
     */
    public dispose(): void {
        this.stopAnimation();
        this.controls.dispose();
        this.renderer.dispose();
        window.removeEventListener('resize', this.handleResize.bind(this));
    }
}
