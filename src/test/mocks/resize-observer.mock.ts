class ResizeObserverMock {
  private entries: ResizeObserverEntry[] = [];

  observe(element: Element): void {
    this.entries.push({
      target: element,
      contentRect: element.getBoundingClientRect(),
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    } as ResizeObserverEntry);
  }

  unobserve(element: Element): void {
    this.entries = this.entries.filter((entry) => entry.target !== element);
  }

  disconnect(): void {
    this.entries = [];
  }
}

export default ResizeObserverMock;
