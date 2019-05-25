export default class OrderedMap<K, V> {
  private map: Map<K, [number, V]>;
  private keyOrder: Array<K>;
  constructor(data?: Array<[K, V]>) {
    if (data) {
      this.map = new Map(data.map(([key, value], i) => [key, [i, value]]));
      this.keyOrder = data.map(([key]) => key);
    } else {
      this.map = new Map();
      this.keyOrder = [];
    }
  }

  get size() {
    return this.keyOrder.length;
  }

  get(key: K) {
    const entry = this.map.get(key);
    if (entry) {
      return entry[1];
    }
    return null;
  }

  keyAt(i: number) {
    if (i >= this.keyOrder.length || i < 0) {
      throw new Error('index out of range');
    }
    return this.keyOrder[i];
  }

  at(i: number) {
    if (i >= this.keyOrder.length || i < 0) {
      throw new Error('index out of range');
    }
    const key = this.keyOrder[i];
    return this.getKnown(key);
  }

  set(key: K, value: V) {
    const existingEntry = this.map.get(key);
    if (existingEntry) {
      existingEntry[1] = value;
    } else {
      const index = this.keyOrder.length;
      this.keyOrder.push(key);
      this.map.set(key, [index, value]);
    }
  }

  private getKnown(key: K) {
    const entry = this.map.get(key);
    if (!entry) {
      throw new Error('known key not found');
    }
    return entry[1];
  }

  forEach(func: (value: V, key: K, map: OrderedMap<K, V>) => void) {
    this.keyOrder.forEach(key => func(this.getKnown(key), key, this));
  }

  findReversed(predicate: (value: V, key: K, map: OrderedMap<K, V>) => boolean) {
    for (let i = this.keyOrder.length - 1; i >= 0; i--) {
      const key = this.keyOrder[i];
      const value = this.getKnown(key);
      if (predicate(value, key, this)) {
        return value;
      }
    }
    return null;
  }

  toJSON(): Array<[K, V]> {
    return this.keyOrder.map(key => [key, this.getKnown(key)]);
  }
}
