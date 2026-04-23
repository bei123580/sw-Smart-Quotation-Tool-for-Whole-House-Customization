# 全屋定制智能报价器 v1.3

formula-version: `v1.3 (2026-04-21)`

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
t  = boardThickness
D' = hasDoor ? (D - 20) : D            // 门板进深补偿，仅影响计算层，D 原值保留

area_side        = D' * H * 2                                    // 侧板通深通高
area_top_bottom  = (W - 2t) * (D' - t) * 2                       // 顶底板嵌入侧板、扣减背板
area_back        = (W - 2t) * H * 1                              // 背板贴于侧板之间、通高
area_shelf_h     = (W - 2t) * (D' - t) * shelfHCount             // 横层板同顶底板
area_shelf_v     = (D' - t) * (H - 2t) * shelfVCount             // 中竖板扣减背板与顶底板

area_cabinet_mm2 = area_side + area_top_bottom + area_back + area_shelf_h + area_shelf_v
cabinetAreaM2    = area_cabinet_mm2 / 1_000_000

area_door_mm2    = hasDoor ? (doorW * doorH * doorCount) : 0
doorAreaM2       = area_door_mm2 / 1_000_000

cabinetCost      = cabinetAreaM2 * unitPrice
doorCost         = doorAreaM2   * doorUnitPrice

coeff            = isNonStd ? 1.2 : 1.0
finalPrice       = (cabinetCost + doorCost) * coeff + hardwareFee
```

关键不变式：

1. `hardwareFee` 不乘非标系数
2. `doorCost` 必须使用 `doorUnitPrice`，绝不使用 `unitPrice`
3. 非标系数同时作用于 `cabinetCost` 与 `doorCost`
4. `hasDoor=true` 时所有涉及 `D` 的板件必须用 `D' = D - 20`
5. `hasDoor=false` 时门板字段全部忽略，`doorCost = 0`
6. 中间量全程 `number` 不舍入，仅渲染层格式化
7. 硬拦截：`hasDoor && D ≤ 20` / `W ≤ 2t` / `H ≤ 2t`

### 快速估算模式

```text
projectionAreaM2   = W * H / 1_000_000
projectionEstimate = projectionAreaM2 * projectionUnitPrice
```

规则：不参与非标系数、不含五金、不含门板。

## 7. 字段契约

### 精算模式（Accurate Tab）

| 中文字段 | 代码 key | 类型 | 单位 | 范围 | 默认 | 必填 |
|---|---|---|---|---|---|---|
| 宽度 | `W` | int | mm | 1 ~ 2400 | — | 是 |
| 进深 | `D` | int | mm | 1 ~ 1200 | — | 是 |
| 高度 | `H` | int | mm | 1 ~ 2400 | — | 是 |
| 板材厚度 | `boardThickness` | int | mm | 9 ~ 25 | 18 | 是 |
| 横层板数量 | `shelfHCount` | int | 片 | 0 ~ 10 | 0 | 是 |
| 中竖板数量 | `shelfVCount` | int | 片 | 0 ~ 10 | 0 | 是 |
| 是否含门 | `hasDoor` | boolean | — | — | false | 是 |
| 门板宽度 | `doorW` | int | mm | 1 ~ 2400 | 自动填 `W` | `hasDoor=true` 时必填 |
| 门板高度 | `doorH` | int | mm | 1 ~ 2400 | 自动填 `H` | `hasDoor=true` 时必填 |
| 门板数量 | `doorCount` | int | 扇 | 1 ~ 6 | 1 | `hasDoor=true` 时必填 |
| 门板单价 | `doorUnitPrice` | number | 元/m² | 1 ~ 10000 | — | `hasDoor=true` 时必填 |
| 是否非标件 | `isNonStd` | boolean | — | — | false | 是 |
| 特殊五金加价 | `hardwareFee` | number | 元 | 0 ~ 99999.99 | 0 | 是 |
| 柜体板材单价 | `unitPrice` | number | 元/m² | 1 ~ 10000 | — | 是 |

### 快速估算模式（Quick Tab）

| 中文字段 | 代码 key | 类型 | 单位 | 范围 | 必填 |
|---|---|---|---|---|---|
| 宽度 | `W` | int | mm | 1 ~ 2400 | 是 |
| 高度 | `H` | int | mm | 1 ~ 2400 | 是 |
| 投影单价 | `projectionUnitPrice` | number | 元/m² | 1 ~ 50000 | 是 |

## 最终 Checklist

- [ ] `npm run dev` 可打开，精确报价 / 快速估算两个 Tab 可切换
- [ ] Tab 切换不丢失另一侧字段
- [ ] 门板字段联动（自动填 + 保留用户值）正确
- [ ] 基准算例最终报价 = ¥616.50（W=580 D=500 H=750 含门 shelfH=1 单价100 门单价180 五金350）
- [ ] 快速估算基准 = ¥652.50（W=580 H=750 投影单价1500）
- [ ] Excel 导出包含门板明细与门板汇总
- [ ] 历史记录区分 [精算] / [估算] 前缀
- [ ] 回填后 Tab 自动切换到对应模式
- [ ] `npm run test` 全部通过
- [ ] `npm run build` 无 type error、无 lint error
