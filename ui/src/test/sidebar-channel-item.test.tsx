import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SidebarChannelItem } from "@/presentation/molecules/sidebar-channel-item";

const channel = {
  channelId: "channel-1",
  channelName: "学習フィードバックの整理",
  lastMessagedAtLabel: "2026-05-21 14:00",
  isSelected: false,
  deleteLabel: "学習フィードバックの整理 を削除",
} as const;

describe("SidebarChannelItem", () => {
  afterEach(() => {
    cleanup();
  });

  it("calls onSelect when the row is clicked", async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(
      <SidebarChannelItem
        channel={channel}
        onSelect={handleSelect}
        onDelete={vi.fn()}
      />
    );

    const selectButton = screen
      .getByText(channel.channelName)
      .closest("button");

    expect(selectButton).not.toBeNull();

    await user.click(selectButton!);

    expect(handleSelect).toHaveBeenCalledWith(channel.channelId);
  });

  it("does not trigger selection when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    const handleDelete = vi.fn();

    render(
      <SidebarChannelItem
        channel={channel}
        onSelect={handleSelect}
        onDelete={handleDelete}
      />
    );

    await user.click(screen.getAllByRole("button", { name: channel.deleteLabel })[0]);

    expect(handleDelete).toHaveBeenCalledWith(channel.channelId);
    expect(handleSelect).not.toHaveBeenCalled();
  });
});
