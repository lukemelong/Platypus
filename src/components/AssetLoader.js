/**
 * This component loads a list of assets, wrapping [PreloadJS](http://www.createjs.com/Docs/PreloadJS/modules/PreloadJS.html) or [SpringRoll](http://springroll.github.io/SpringRoll/classes/springroll.Loader.html)loading functionality into a game engine component.
 *
 * @namespace platypus.components
 * @class AssetLoader
 * @uses Component
 */
/*global console, platypus */
/*jslint plusplus:true */
(function () {
    "use strict";
    
    var createId = function (src) { // returns just the filename (sans extension) as the Id.
            var arr = src.split('/');
            
            arr = arr[arr.length - 1].split('.');
            
            return arr[0];
        },
        checkPush  = function (asset, list) {
            var i = 0,
                found = false;
            
            if (!asset.id) {
                asset.id = createId(asset.src);
            }
            
            for (i = 0; i < list.length; i++) {
                if (list[i].id === asset.id) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                list.push(asset);
            }
        };
    
    return platypus.createComponentClass({
        id: 'AssetLoader',
        
        properties: {
            /**
             * Determines whether to automatically load assets when this component loads.
             * 
             * @property automatic
             * @type boolean
             * @default true
             */
            automatic: true,
            
            /**
             * A list of assets to load. If not provided, the asset list is pulled directly from the game configuration file's asset list.
             * 
             * The list of assets should use PreloadJS syntax such as:
             *       [
             *           {"id": "item-1",         "src": "images/item-1.png"},
             *           {"id": "item-2",         "src": "images/item-2.png"},
             *           {"id": "item-3",         "src": "images/item-3.png"}
             *       ]
             * 
             * @property assets
             * @type Array
             * @default null
             */
            assets: null,
            
            /**
             * Determines whether to store the loaded assets automatically in platypus.assets for later retrieval.
             * 
             * @property cache
             * @type boolean
             * @default true
             */
            cache: true,
            
            /**
             * Whether images are loaded from a CORS-enabled domain.
             * 
             * @property crossOrigin
             * @type String
             * @default ""
             */
            crossOrigin: '',
            
            /**
             * Whether to use XHR for asset downloading.
             * 
             * @property useXHR
             * @type boolean
             * @default true
             */
            useXHR: true
        },

        constructor: function (definition) {
            if (!this.assets) {
                this.assets = platypus.game.settings.assets;
            }
            
            if (window && window.springroll && window.springroll.Application && window.springroll.Application.instance) {
                this.loader      = window.springroll.Application.instance.loader;
                this.soundLoader = window.springroll.Application.instance.sound;
            } else {
                console.warn('AssetLoader: Must have SpringRoll loaded to load assets.');
            }
            
            this.owner.assets = {};
            this.progress = 0;
            this.total = 0;
            this.assetInterface = null;
        },

        events: {
            /**
             * On receiving this event, the asset loader begins downloading the list of assets if the "automatic" property is not set to `false`.
             * 
             * @method 'load'
             */
            "load": function () {
                if (this.automatic) {
                    /**
                     * This event is triggered as soon as the entity loads if the "automatic" property is not set to `false`.
                     * 
                     * @event 'load-assets'
                     */
                    this.owner.triggerEvent('load-assets');
                }
            },

            /**
             * On receiving this event, the asset loader begins downloading the list of assets.
             * 
             * @method 'load-assets'
             */
            "load-assets": function () {
                var self = this,
                    onFileLoad = function (resp) {
                        var asset = null;
                        
                        if (resp) {
                            asset = self.owner.assets[resp.manifestData.id] = {
                                data:  resp.manifestData.data,
                                asset: resp.content
                            };
                        
                            if (self.cache) {
                                platypus.assets[resp.manifestData.id] = asset;
                            }
                        } else { // audio files don't return any data from the SpringRoll loader.
                            resp = {
                                content: null,
                                manifestData: {data: null}
                            };
                        }
                        
                        self.progress += 1;
                        
                        /**
                         * This message is broadcast when an asset has been loaded.
                         * 
                         * @event 'file-load'
                         * @param load {Object} 
                         * @param load.asset {Object} Loaded asset. (`null` for audio)
                         * @param load.data {Object} Key/value pairs containing asset data. (`null` for audio) 
                         * @param load.complete {boolean} Whether this is the final asset to be loaded.
                         * @param load.total {number} The total number of assets being loaded.
                         * @param load.progress {number} The number of assets finished loading.
                         * @param load.fraction {number} Value of (progress / total) provided for convenience.
                         */
                        self.owner.trigger('file-load', {
                            asset:    resp.content,
                            complete: (self.progress === self.total),
                            data:     resp.manifestData.data,
                            fraction: self.progress / self.total,
                            progress: self.progress,
                            total:    self.total
                        });
                        
                        if (self.progress === self.total) {
                            /**
                             * This message is triggered when the asset loader is finished loading assets.
                             * 
                             * @event 'complete'
                             */
                            self.owner.triggerEvent('complete');
                        }
                    };
                
                this.load(onFileLoad);
            }
        },
        
        methods: {
            destroy: function () {
                delete this.owner.assets;
            },
            
            load: function (onFileLoad, onSoundLoad) {
                var i = 0,
                    loadAssets = [];

                for (i = 0; i < this.assets.length; i++) {
                    if (typeof this.assets[i] === 'string') {
                        checkPush({src: this.assets[i]}, loadAssets);
                    } else if (typeof this.assets[i].src === 'string') {
                        checkPush(this.assets[i], loadAssets);
                    }
                }

                platypus.assets = platypus.assets || {};
                this.total = loadAssets.length;
                for (i = 0; i < loadAssets.length; i++) {
                    if (this.soundLoader && this.soundLoader.exists(loadAssets[i].id)) {
                        this.soundLoader.preloadSound(loadAssets[i].id, onFileLoad);
                    } else {
                        this.loader.load(loadAssets[i].src, onFileLoad, null, 0, loadAssets[i]);
                    }
                }
            }
        }
    });
}());
