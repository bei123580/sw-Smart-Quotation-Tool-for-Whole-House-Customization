import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuotationShell } from "./quotation-shell";
import { exportQuotationToExcel } from "@/lib/exporter";

vi.mock("@/lib/exporter", () => ({
  exportQuotationToExcel: vi.fn(),
}));

describe("QuotationShell v1.3 form", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("keeps accurate and quick tab values isolated", async () => {
    const user = userEvent.setup();

    render(<QuotationShell />);

    await user.type(screen.getByLabelText("宽度 W"), "580");
    await user.click(screen.getByRole("tab", { name: "快速估算" }));

    expect(screen.getByLabelText("宽度 W")).toHaveValue("");

    await user.type(screen.getByLabelText("宽度 W"), "900");
    await user.click(screen.getByRole("tab", { name: "精确报价" }));

    expect(screen.getByLabelText("宽度 W")).toHaveValue("580");
  });

  it("expands door fields and auto-fills door dimensions only on first open", async () => {
    const user = userEvent.setup();

    render(<QuotationShell />);

    await user.type(screen.getByLabelText("宽度 W"), "580");
    await user.type(screen.getByLabelText("高度 H"), "750");
    await user.click(screen.getByLabelText("是否含门"));

    expect(screen.getByLabelText("门板宽度")).toHaveValue("580");
    expect(screen.getByLabelText("门板高度")).toHaveValue("750");
    expect(screen.getByLabelText("门板数量")).toHaveValue("1");

    await user.clear(screen.getByLabelText("门板宽度"));
    await user.type(screen.getByLabelText("门板宽度"), "600");
    await user.click(screen.getByLabelText("是否含门"));
    await user.click(screen.getByLabelText("是否含门"));

    expect(screen.getByLabelText("门板宽度")).toHaveValue("600");
  });

  it("shows hard blockers, soft warnings, and valid accurate preview", async () => {
    const user = userEvent.setup();

    render(<QuotationShell />);

    const submitButton = screen.getByRole("button", { name: "生成报价" });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText("宽度 W"), "30");
    await user.type(screen.getByLabelText("进深 D"), "20");
    await user.type(screen.getByLabelText("高度 H"), "30");
    await user.type(screen.getByLabelText("柜体板材单价"), "100");
    await user.click(screen.getByLabelText("是否含门"));

    expect(screen.getByText("含门时进深须 > 20mm")).toBeInTheDocument();
    expect(screen.getByText("宽度须大于 2 倍板材厚度")).toBeInTheDocument();
    expect(screen.getByText("高度须大于 2 倍板材厚度")).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    await user.clear(screen.getByLabelText("宽度 W"));
    await user.type(screen.getByLabelText("宽度 W"), "2401");
    await user.clear(screen.getByLabelText("进深 D"));
    await user.type(screen.getByLabelText("进深 D"), "500");
    await user.clear(screen.getByLabelText("高度 H"));
    await user.type(screen.getByLabelText("高度 H"), "2400");
    await user.clear(screen.getByLabelText("门板宽度"));
    await user.type(screen.getByLabelText("门板宽度"), "2422");
    await user.type(screen.getByLabelText("门板单价"), "180");

    expect(screen.getByText("超出标准板材 1200×2400，建议分柜")).toBeInTheDocument();
    expect(screen.getByText("门板尺寸明显大于柜体开口")).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    await user.clear(screen.getByLabelText("门板宽度"));
    await user.type(screen.getByLabelText("门板宽度"), "602");
    await user.clear(screen.getByLabelText("宽度 W"));
    await user.type(screen.getByLabelText("宽度 W"), "580");
    expect(screen.getByText("门板尺寸明显大于柜体开口")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("门板宽度"));
    await user.type(screen.getByLabelText("门板宽度"), "580");
    await user.clear(screen.getByLabelText("宽度 W"));
    await user.type(screen.getByLabelText("宽度 W"), "580");
    await user.clear(screen.getByLabelText("高度 H"));
    await user.type(screen.getByLabelText("高度 H"), "750");
    await user.clear(screen.getByLabelText("门板高度"));
    await user.type(screen.getByLabelText("门板高度"), "750");
    await user.type(screen.getByLabelText("特殊五金加价"), "350");
    await user.clear(screen.getByLabelText("横层板数量"));
    await user.type(screen.getByLabelText("横层板数量"), "1");

    expect(submitButton).toBeEnabled();

    const preview = screen.getByLabelText("实时预览");
    expect(within(preview).getByText("1.882")).toBeInTheDocument();
    expect(within(preview).getByText("0.435")).toBeInTheDocument();
    expect(within(preview).getByText("616.50")).toBeInTheDocument();
  });

  it("renders quick estimate fields and preview with shared history", async () => {
    const user = userEvent.setup();

    render(<QuotationShell />);

    expect(screen.getByRole("button", { name: "历史记录" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "快速估算" }));

    expect(screen.getByRole("button", { name: "历史记录" })).toBeInTheDocument();
    expect(screen.getByLabelText("宽度 W")).toBeInTheDocument();
    expect(screen.getByLabelText("高度 H")).toBeInTheDocument();
    expect(screen.getByLabelText("投影单价")).toBeInTheDocument();

    await user.type(screen.getByLabelText("宽度 W"), "580");
    await user.type(screen.getByLabelText("高度 H"), "750");
    await user.type(screen.getByLabelText("投影单价"), "1500");

    const preview = screen.getByLabelText("实时预览");
    expect(within(preview).getByText("0.435")).toBeInTheDocument();
    expect(within(preview).getByText("652.50")).toBeInTheDocument();
  });

  it("renders accurate result details, exports Excel, and stores accurate history", async () => {
    const user = userEvent.setup();

    render(<QuotationShell />);

    await user.type(screen.getByLabelText("宽度 W"), "580");
    await user.type(screen.getByLabelText("进深 D"), "500");
    await user.type(screen.getByLabelText("高度 H"), "750");
    await user.clear(screen.getByLabelText("横层板数量"));
    await user.type(screen.getByLabelText("横层板数量"), "1");
    await user.type(screen.getByLabelText("柜体板材单价"), "100");
    await user.type(screen.getByLabelText("特殊五金加价"), "350");
    await user.click(screen.getByLabelText("是否含门"));
    await user.type(screen.getByLabelText("门板单价"), "180");

    await user.click(screen.getByRole("button", { name: "生成报价" }));

    expect(screen.getByRole("heading", { name: "¥ 616.50" })).toBeInTheDocument();
    expect(screen.getByText("柜体 ¥188.20 + 门板 ¥78.30")).toBeInTheDocument();
    expect(screen.getByText("柜体明细")).toBeInTheDocument();
    expect(screen.getByText("门板明细")).toBeInTheDocument();
    expect(screen.getByText("柜体展开面积：")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "导出 Excel" }));
    expect(exportQuotationToExcel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "返回修改" }));
    await user.click(screen.getByRole("button", { name: "历史记录" }));

    expect(screen.getByText(/\[精算\]/)).toBeInTheDocument();
    expect(screen.getByText(/¥616.50/)).toBeInTheDocument();
  });

  it("renders quick result without export and can switch back to accurate tab", async () => {
    const user = userEvent.setup();

    render(<QuotationShell />);

    await user.click(screen.getByRole("tab", { name: "快速估算" }));
    await user.type(screen.getByLabelText("宽度 W"), "580");
    await user.type(screen.getByLabelText("高度 H"), "750");
    await user.type(screen.getByLabelText("投影单价"), "1500");
    await user.click(screen.getByRole("button", { name: "生成报价" }));

    expect(screen.getByRole("heading", { name: "¥ 652.50 （估算）" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "导出 Excel" })).not.toBeInTheDocument();
    expect(screen.getByText(/仅供图纸未出时粗估参考/)).toBeInTheDocument();
    expect(screen.queryByText("非标")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "切换到精确报价" }));
    expect(screen.getByRole("tab", { name: "精确报价" })).toHaveAttribute("aria-selected", "true");
  });
});
