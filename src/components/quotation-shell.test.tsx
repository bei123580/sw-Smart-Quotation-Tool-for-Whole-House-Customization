import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { QuotationShell } from "./quotation-shell";

describe("QuotationShell stage 2", () => {
  it("keeps accurate and quick form states isolated across tab switching", async () => {
    const user = userEvent.setup();

    render(<QuotationShell />);

    await user.type(screen.getByLabelText("宽度"), "580");
    await user.click(screen.getByRole("tab", { name: "快速估算" }));
    expect(screen.getByLabelText("宽度")).toHaveValue(null);

    await user.type(screen.getByLabelText("宽度"), "900");
    await user.click(screen.getByRole("tab", { name: "精确报价" }));
    expect(screen.getByLabelText("宽度")).toHaveValue(580);
  });

  it("auto-fills door size on first open and preserves touched door width on reopen", async () => {
    const user = userEvent.setup();

    render(<QuotationShell />);

    await user.type(screen.getByLabelText("宽度"), "580");
    await user.type(screen.getByLabelText("高度"), "750");
    await user.click(screen.getByLabelText("是否含门"));

    expect(screen.getByLabelText("门板宽度")).toHaveValue(580);
    expect(screen.getByLabelText("门板高度")).toHaveValue(750);
    expect(screen.getByLabelText("门板数量")).toHaveValue(1);

    await user.clear(screen.getByLabelText("门板宽度"));
    await user.type(screen.getByLabelText("门板宽度"), "600");
    await user.click(screen.getByLabelText("是否含门"));
    await user.click(screen.getByLabelText("是否含门"));

    expect(screen.getByLabelText("门板宽度")).toHaveValue(600);
    expect(screen.getByLabelText("门板高度")).toHaveValue(750);
  });

  it("shows hard blockers and keeps submit disabled when required values are invalid", async () => {
    const user = userEvent.setup();

    render(<QuotationShell />);

    await user.type(screen.getByLabelText("宽度"), "36");
    await user.type(screen.getByLabelText("进深"), "20");
    await user.type(screen.getByLabelText("高度"), "36");
    await user.type(screen.getByLabelText("柜体板材单价"), "100");
    await user.click(screen.getByLabelText("是否含门"));

    expect(screen.getByText("含门时进深须大于 20mm")).toBeInTheDocument();
    expect(screen.getByText("宽度须大于 2 倍板材厚度")).toBeInTheDocument();
    expect(screen.getByText("高度须大于 2 倍板材厚度")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成报价" })).toBeDisabled();
  });

  it("shows soft warnings without blocking submission and renders the accurate preview benchmark", async () => {
    const user = userEvent.setup();

    render(<QuotationShell />);

    await user.type(screen.getByLabelText("宽度"), "2500");
    expect(screen.getByText("超出标准板材 1200×2400，建议分柜")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("宽度"));
    await user.type(screen.getByLabelText("宽度"), "580");
    await user.type(screen.getByLabelText("进深"), "500");
    await user.type(screen.getByLabelText("高度"), "750");
    await user.clear(screen.getByLabelText("横层板数量"));
    await user.type(screen.getByLabelText("横层板数量"), "1");
    await user.type(screen.getByLabelText("柜体板材单价"), "100");
    await user.type(screen.getByLabelText("特殊五金加价"), "350");
    await user.click(screen.getByLabelText("是否含门"));
    await user.type(screen.getByLabelText("门板单价"), "180");

    const preview = screen.getByLabelText("精确报价预览");

    expect(within(preview).getByText("1.882 m²")).toBeInTheDocument();
    expect(within(preview).getByText("0.435 m²")).toBeInTheDocument();
    expect(within(preview).getByText("¥616.50")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成报价" })).toBeEnabled();
  });

  it("renders quick preview benchmark and submits into placeholder result", async () => {
    const user = userEvent.setup();

    render(<QuotationShell />);

    await user.click(screen.getByRole("tab", { name: "快速估算" }));
    await user.type(screen.getByLabelText("宽度"), "580");
    await user.type(screen.getByLabelText("高度"), "750");
    await user.type(screen.getByLabelText("投影单价"), "1500");

    const preview = screen.getByLabelText("快速估算预览");

    expect(within(preview).getByText("0.435 m²")).toBeInTheDocument();
    expect(within(preview).getByText("¥652.50")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "生成估算" }));

    expect(screen.getByText("结果页占位（阶段 3 实现）")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回修改" })).toBeInTheDocument();
  });
});
