export const toggleShow = (el: HTMLElement) => {
    const display = el.style.display;
    if (!el.dataset.originalDisplaySetting) {
        el.dataset.originalDisplaySetting = display;
    }
    if (display === "none") {
        el.style.display = el.dataset.originalDisplaySetting === "none" ? "" : el.dataset.originalDisplaySetting || "";
        return;
    }
    el.style.display = "none";
}