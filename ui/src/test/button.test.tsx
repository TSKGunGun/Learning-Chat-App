import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/presentation/atoms/button";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>送信</Button>);

    expect(screen.getByRole("button", { name: "送信" })).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    const { rerender } = render(<Button variant="default">既定</Button>);

    expect(screen.getByRole("button", { name: "既定" })).toHaveClass("bg-primary");

    rerender(<Button variant="secondary">補助</Button>);
    expect(screen.getByRole("button", { name: "補助" })).toHaveClass("bg-secondary");

    rerender(<Button variant="outline">アウトライン</Button>);
    expect(screen.getByRole("button", { name: "アウトライン" })).toHaveClass(
      "border"
    );

    rerender(<Button variant="ghost">ゴースト</Button>);
    expect(screen.getByRole("button", { name: "ゴースト" })).toHaveClass(
      "hover:bg-accent"
    );
  });

  it("applies size classes", () => {
    const { rerender } = render(<Button size="default">既定サイズ</Button>);

    expect(screen.getByRole("button", { name: "既定サイズ" })).toHaveClass("h-10");

    rerender(<Button size="sm">小</Button>);
    expect(screen.getByRole("button", { name: "小" })).toHaveClass("h-9");

    rerender(<Button size="lg">大</Button>);
    expect(screen.getByRole("button", { name: "大" })).toHaveClass("h-11");
  });

  it("calls the click handler when enabled", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>クリック</Button>);

    await user.click(screen.getByRole("button", { name: "クリック" }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not call the click handler when disabled", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button disabled onClick={handleClick}>
        無効
      </Button>
    );

    await user.click(screen.getByRole("button", { name: "無効" }));

    expect(handleClick).not.toHaveBeenCalled();
  });
});
