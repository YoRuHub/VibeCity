import { TileType, TILE_PALETTE_COLORS } from '../hex/TileTypes';

/**
 * タイル選択UIパレット
 * 画面下部にカラーボタンを表示し、タイルタイプを選択
 */
export class TilePalette {
    private container!: HTMLDivElement; // Definite assignment assertion
    private selectedType: TileType = TileType.Road; // デフォルトは道タイル

    /** UIを生成 */
    constructor() {
        this.createUI();
    }

    /**
     * UI要素を生成
     */
    private createUI(): void {
        this.container = document.createElement('div');
        this.container.className = 'tile-palette';

        // タイルボタンを生成（Empty以外）
        Object.values(TileType).forEach(type => {
            if (type === TileType.Empty) return;

            const btn = document.createElement('button');
            btn.className = 'tile-btn';
            btn.dataset.type = type;
            btn.title = this.getTileLabel(type); // ツールチップ

            // ボタンの色を設定
            const color = TILE_PALETTE_COLORS[type];
            btn.style.backgroundColor = color;

            // クリックイベント
            btn.addEventListener('click', () => this.selectTile(type));

            this.container.appendChild(btn);
        });

        // 初期選択状態を適用
        this.updateSelection();

        document.body.appendChild(this.container);
    }

    /**
     * タイルタイプのラベルを取得
     */
    private getTileLabel(type: TileType): string {
        const labels: Record<TileType, string> = {
            [TileType.Empty]: '空',
            [TileType.Road]: '道',
            [TileType.Water]: '水',
            [TileType.Grass]: '草地',
            [TileType.Stone]: '石畳'
        };
        return labels[type] || type;
    }

    /** タイルを選択 */
    private selectTile(type: TileType): void {
        this.selectedType = type;
        this.updateSelection();
    }

    /**
     * 選択状態のUIを更新
     */
    private updateSelection(): void {
        document.querySelectorAll('.tile-btn').forEach(btn => {
            const element = btn as HTMLElement;
            element.classList.toggle('selected', element.dataset.type === this.selectedType);
        });
    }

    /** 選択中のタイルタイプを取得 */
    public getSelectedType(): TileType {
        return this.selectedType;
    }

    /** リソース破棄 */
    public dispose(): void {
        if (this.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
    }
}
