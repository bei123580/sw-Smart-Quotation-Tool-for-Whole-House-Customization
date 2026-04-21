# 全屋定制智能报价器 V1.3

## 1. 项目简介

本项目是基于 PRD v1.3 实现的单柜版「全屋定制智能报价器」，提供精确报价、快速估算、字段契约校验、结果卡片渲染、浏览器端 Excel 导出和本地历史记录能力，适用于本地开发、预览与部署。

## 2. 技术栈

- Next.js 14
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod
- Vitest
- SheetJS

## 3. 目录结构

```text
.
├── docs/
│   └── superpowers/
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   │   └── __tests__/
│   └── test/
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

## 4. 本地开发

Node.js 版本要求 `>= 18`。

```bash
npm i
npm run dev
npm run test -- --run
npm run build
```

默认开发地址为 [http://localhost:3000](http://localhost:3000)。

## 5. 部署指南

使用 Vercel 部署：

1. 将项目推送到 Git 仓库。
2. 登录 Vercel，点击 `Add New Project`。
3. 选择当前仓库并导入。
4. Framework Preset 选择 `Next.js`。
5. Build Command 保持默认 `next build`，Output 由 Vercel 自动识别。
6. 点击 `Deploy` 完成部署。

本项目无需任何环境变量。

## 6. 公式速查

### 精算模式

```text
# formula-version: v1.3 (2026-04-21)

# 常量与派生量
t  = boardThickness
D' = hasDoor ? (D - 20) : D

# 板件实际尺寸
area_side        = D' × H × 2
area_top_bottom  = (W - 2t) × (D' - t) × 2
area_back        = (W - 2t) × H × 1
area_shelf_h     = (W - 2t) × (D' - t) × shelfHCount
area_shelf_v     = (D' - t) × (H - 2t) × shelfVCount

area_cabinet_mm2 = area_side + area_top_bottom + area_back + area_shelf_h + area_shelf_v
area_cabinet_m2  = area_cabinet_mm2 / 1_000_000

area_door_mm2    = hasDoor ? (doorW × doorH × doorCount) : 0
area_door_m2     = area_door_mm2 / 1_000_000

cabinetCost      = area_cabinet_m2 × unitPrice
doorCost         = area_door_m2 × doorUnitPrice

coeff            = isNonStd ? 1.2 : 1.0
finalPrice       = (cabinetCost + doorCost) × coeff + hardwareFee
```

### 快速估算模式

```text
area_projection_m2  = W × H / 1_000_000
projectionEstimate  = area_projection_m2 × projectionUnitPrice
```

## 7. 字段契约

### 精算模式

| 中文字段 | 代码 key | 类型 | 单位 | 范围 | 默认 | 必填 |
|---|---|---|---|---|---|---|
| 宽度 | `W` | int | mm | 1 ~ 2400 | — | ✅ |
| 进深 | `D` | int | mm | 1 ~ 1200 | — | ✅ |
| 高度 | `H` | int | mm | 1 ~ 2400 | — | ✅ |
| 板材厚度 | `boardThickness` | int | mm | 9 ~ 25 | 18 | ✅ |
| 横层板数量 | `shelfHCount` | int | 片 | 0 ~ 10 | 0 | ✅ |
| 中竖板数量 | `shelfVCount` | int | 片 | 0 ~ 10 | 0 | ✅ |
| 是否含门 | `hasDoor` | boolean | — | — | false | ✅ |
| 门板宽度 | `doorW` | int | mm | 1 ~ 2400 | 自动填 `W` | `hasDoor=true` 时必填 |
| 门板高度 | `doorH` | int | mm | 1 ~ 2400 | 自动填 `H` | `hasDoor=true` 时必填 |
| 门板数量 | `doorCount` | int | 扇 | 1 ~ 6 | 1 | `hasDoor=true` 时必填 |
| 门板单价 | `doorUnitPrice` | number | 元/m² | 1 ~ 10000 | — | `hasDoor=true` 时必填 |
| 是否非标件 | `isNonStd` | boolean | — | — | false | ✅ |
| 特殊五金加价 | `hardwareFee` | number | 元 | 0 ~ 99999.99 | 0 | ✅ |
| 板材单价 | `unitPrice` | number | 元/m² | 1 ~ 10000 | — | ✅ |

### 快速估算模式

| 中文字段 | 代码 key | 类型 | 单位 | 范围 | 必填 |
|---|---|---|---|---|---|
| 宽度 | `W` | int | mm | 1 ~ 2400 | ✅ |
| 高度 | `H` | int | mm | 1 ~ 2400 | ✅ |
| 投影单价 | `projectionUnitPrice` | number | 元/m² | 1 ~ 50000 | ✅ |

## Checklist

- [ ] `npm run dev` 可打开，精确报价 / 快速估算两个 Tab 可切换
- [ ] Tab 切换后另一 Tab 表单状态不丢失
- [ ] 精算模式支持板材厚度，默认 `18`
- [ ] 精算模式含门时展示门板宽度、高度、数量、单价
- [ ] 门板宽度 / 高度首次打开自动填入 `W` / `H`
- [ ] 含门时进深补偿 `D - 20` 生效
- [ ] 门板使用 `doorUnitPrice` 独立计价
- [ ] 非标系数同时作用于柜体与门板，五金不乘非标系数
- [ ] 快速估算模式显示投影面积与估算报价
- [ ] 硬拦截触发时按钮置灰并显示红字
- [ ] 软提示触发时显示黄字但不拦截
- [ ] 精算结果渲染柜体明细、门板明细、中间量和导出按钮
- [ ] 快速估算结果不显示 Excel 导出按钮
- [ ] 文件名 `报价单_YYYYMMDD_HHmmss.xlsx`
- [ ] Sheet 名 `报价_YYYYMMDD_HHmmss`，合法字符
- [ ] 历史记录最多保留 5 条，最新在前
- [ ] 历史记录显示 `[精算]` / `[估算]` 标记
- [ ] 回填按钮能按 mode 自动切换 Tab 并写回对应表单
- [ ] localStorage 不可用时降级不崩溃
- [ ] `npm run test` 全部通过
- [ ] `npm run build` 无 type error、无 lint error
