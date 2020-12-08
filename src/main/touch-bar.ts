import path from "path";
import { isDevelopment } from "../common/vars";
import { BrowserWindow, ipcMain, NativeImage, nativeImage, TouchBar, TouchBarGroup } from "electron";
import { broadcastMessage } from "../common/ipc";
import { IDockTab } from "../renderer/components/dock/dock.store";

export enum TouchChannels {
  SetTouchBar = "touchbar:set-touch-bar",
  SetDockBar = "touchbar:set-dock-bar",
  SetPodsBar = "touchbar:set-pods-bar",
  SelectDockTab = "touchbar:select-dock-tab",
  CloseAllDockTabs = "touchbar:close-all-dock-tabs",
}

function getIcon(filename: string): NativeImage {
  const filePath = path.resolve(
    __static,
    isDevelopment ? "../build/touchbar" : "icons", // copied within electron-builder extras
    filename
  );

  return nativeImage.createFromPath(filePath);
}

function getDashboardTouchBar(centralGroup?: TouchBarGroup) {
  const { TouchBarSpacer, TouchBarSegmentedControl } = TouchBar;
  const historySegment = new TouchBarSegmentedControl({
    mode: "buttons",
    segments: [
      { icon: getIcon("back.png") },
      { label: "->" }
    ]
  });

  const dockSegment = new TouchBarSegmentedControl({
    mode: "buttons",
    segments: [
      { label: "T" },
      { label: "+" }
    ]
  });

  // const historyBack = new TouchBarButton({
  //   icon: getIcon("back.png")
  // });
  // const historyForward = new TouchBarButton({
  //   label: "⭢"
  // });
  // const terminal = new TouchBarButton({
  //   label: "T"
  // });
  // const createResource = new TouchBarButton({
  //   label: "+",
  //   backgroundColor: "#3d90ce"
  // });

  return new TouchBar({
    items: [
      historySegment,
      centralGroup || new TouchBarSpacer({ size: "flexible" }),
      dockSegment
    ]
  });
}

function getDockTouchBar(dockTabs: IDockTab[]) {
  const { TouchBarButton, TouchBarScrubber, TouchBarLabel } = TouchBar;
  // TODO: add tab icons
  const tabs = new TouchBarScrubber({
    items: dockTabs.map(tab => ({ label: tab.title })),
    selectedStyle: "outline",
    continuous: false,
    select: (selectedIndex) => {
      broadcastMessage("select-dock-tab", selectedIndex);
    }
  });
  const closeAll = new TouchBarButton({
    label: "Close All",
    backgroundColor: "#e85555",
    click: () => {
      broadcastMessage("close-all-dock-tabs");
    }
  });

  return new TouchBar({
    items: [
      new TouchBarLabel({ label: "Tabs" }),
      tabs,
      closeAll
    ]
  });
}

function getPodsTouchBar(statuses: { [key: string]: number }) {
  const items = Object.entries(statuses).map(([key, value]) => {
    // TODO: Add status icons
    return {
      label: `${key}: ${value}`
    };
  });
  const tabs = new TouchBar.TouchBarScrubber({
    items,
    selectedStyle: "none",
    continuous: false,
  });

  return getDashboardTouchBar(tabs);
}

function setTouchBar(window: BrowserWindow, touchBar: TouchBar) {
  window.setTouchBar(touchBar);
}

function subscribeToEvents(window: BrowserWindow) {
  ipcMain.handle("set-dock-touchbar", (event, dockTabs: IDockTab[]) => {
    const touchBar = getDockTouchBar(dockTabs);

    window.setTouchBar(touchBar);
  });

  ipcMain.handle("set-general-touchbar", () => {
    setTouchBar(window, getDashboardTouchBar());
  });

  ipcMain.handle(TouchChannels.SetPodsBar, (event, podStatuses: { [key: string]: number }) => {
    const touchBar = getPodsTouchBar(podStatuses);

    setTouchBar(window, touchBar);
  });
}

export function initTouchBar(window: BrowserWindow) {
  subscribeToEvents(window);
  setTouchBar(window, getDashboardTouchBar());
}