// @flow

import EventEmitter from 'events';

import type { Element } from './types';
import type { Bridge } from '../types';

const debug = (methodName, ...args) => {
  // console.log(`%cAgent %c${methodName}`, 'color: red; font-weight: bold;', 'font-weight: bold;', ...args);
};

/**
 * The store is the single source of truth for updates from the backend.
 * ContextProviders can subscribe to the Store for specific things they want to provide.
 */
class Store extends EventEmitter {
  _idToElement: Map<string, Element> = new Map();
  _idToParentID: Map<string, string> = new Map();

  // This Array must be treated as immutable!
  // Passive effects will check it for changes between render and mount.
  roots: $ReadOnlyArray<string> = [];

  constructor(bridge: Bridge) {
    super();

    bridge.on('root', this.onBridgeRoot);
    bridge.on('mount', this.onBridgeMount);
    bridge.on('update', this.onBridgeUpdated);
    bridge.on('unmount', this.onBridgeUnmounted);
  }

  getElement(id: string) {
    return this._idToElement.get(id);
  }

  geParent(id: string) {
    return this._idToParentID.get(id);
  }

  onBridgeMount = (element: Element) => {
    const { id } = element;
    debug('onBridgeMount()', element);
    this._idToElement.set(id, element);

    element.children.forEach(childID => {
      this._idToParentID.set(childID, id);
    });

    this.emit(id);
  };

  onBridgeRoot = (id: string) => {
    debug('onBridgeRoot()', id);
    if (!this.roots.includes(id)) {
      this.roots = this.roots.concat(id);
      this.emit('roots');
    }
  };

  onBridgeUnmounted = (id: string) => {
    debug('onBridgeUnmounted()', id);
    this._idToElement.delete(id);

    if (this._idToParentID.has(id)) {
      this._idToParentID.delete(id);
    }

    const index = this.roots.indexOf(id);
    if (index >= 0) {
      this.roots = this.roots
        .slice(0, index)
        .concat(this.roots.slice(index + 1));
      this.emit('roots');
    }
  };

  onBridgeUpdated = (element: Element) => {
    const { id } = element;
    debug('onBridgeUpdated()', element);
    this._idToElement.set(id, element);

    this.emit(id);
  };
}

export default Store;