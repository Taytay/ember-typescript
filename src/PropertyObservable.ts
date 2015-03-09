/// <reference path='EmberBaseObject.ts' />

module ynab.common {
    'use strict';

    export class PropertyObservable extends ynab.common.EmberBaseObjectEx {

        // This counter is used to guarantee that each of of observer methods on our final ember object will be unique.
        private static _observerCounter: number = 0;

        // Note that properties that start with an underscore will not fire change events!
        protected static _setUpPropertyObserversForProperties(properties: string[]) {

            // Note that 'this' will not necessarily be the PropertyObservable class itself
            // but could be any class derived from PropertyObservable.
            // If you are creating a class called `DerivedClass`, by the time this method is called
            // `this` will be the DerivedClass prototype.
            var thisPrototype: PropertyObservable = (<typeof PropertyObservable>this).prototype;

            // We used to use beforeObservers to track the value of properties before they were set
            // But that's been deprecated. So now we rely upon overriding the `set` method. See it below
            var observesFunction = function(observable: PropertyObservable, propertyName: string) {
                var valueBeforeChange: any = observable._getPropertyValueBeforeChange(propertyName);
                var valueAfterChange: any = observable.get(propertyName);

                // And then we notify
                observable._handlePropertyChanged(propertyName, valueBeforeChange, valueAfterChange);
            };

            // And now make our observesFunction recognized by Ember as such
            // We use apply here because normally you don't pass an array into observer. Instead, you pass
            // a list of parameters. By using apply, we can call observer with an array
            // of parameters
            observesFunction = Ember.observer.apply(this, (<Array<any>>properties).concat(observesFunction));

            // Now assign these observer functions to the prototype object
            // Ember will see them when we create the object, and will wire them up as appropriate
            thisPrototype["_observer" + (PropertyObservable._observerCounter++).toString()] = observesFunction;
        }

        /**
         * Sets the property on this object.
         * Note: You must call this method instead of calling `Ember.set(obj, key, val)`
         * Otherwise, you won't get the proper previous value
         * @param propertyName
         * @param val
         */
        public set(propertyName: string, val: any): void {

            // This method overrides the set method Ember normally puts on objects
            // That way, we can capture the value before it changes
            // Note that we could remove the need for this method if we iterated our watched properties
            // at creation time and stored their initial values
            // This also used to be easier when Ember had a beforeObserver, but that has been deprecated
            // I'm open to better ideas here.
            var valueBeforeChange: any = this.get(propertyName);
            if (valueBeforeChange !== val) {
                this._setPropertyValueBeforeChange(propertyName, valueBeforeChange);
                Ember.set(this, propertyName, val);
            }
        }

        // *************************************************************************************************************
        // Utility/Internal Methods
        // *************************************************************************************************************
        // Where we store the previous values of instance properties so that we can fire a useful signal when the property changes
        private _previousValueMap: ynab.utilities.SimpleObjectMap<any> = new ynab.utilities.SimpleObjectMap<any>();

        private _getPropertyValueBeforeChange(propertyName: string): any {
            return this._previousValueMap[propertyName];
        }

        private _setPropertyValueBeforeChange(propertyName: string, val: any): void {
            this._previousValueMap[propertyName] = val;
        }

        private _entityPropertyChanged: ynab.utilities.YNABEntityChangedSignal<any> = new ynab.utilities.YNABEntityChangedSignal<any>();
        public getEntityPropertyChanged(): ynab.utilities.YNABEntityChangedSignal<any> { return this.get("_entityPropertyChanged"); }

        protected _handlePropertyChanged(propertyName: string, previousValue: any, newValue: any) {

            if (newValue == undefined)
                ynab.utilities.ConsoleUtilities.debug("About to set the following property to 'undefined': " + this + "." + propertyName + " This might mean that you are merging a server object into the client, and the server object have this property defined.");

            // Generate the entity property changed signal through the entity
            this._generateEntityPropertyChangedSignal(propertyName, previousValue, newValue);
        }

        protected _generateEntityPropertyChangedSignal(propertyName: string, originalValue: any, newValue: any): void {

            // Don't generate property changing signal for properties beginning with an underscore
            // as these are internal to the entity.
            if (propertyName.charAt(0) !== "_") {

                var signal: ynab.utilities.YNABEntityChangedSignal<PropertyObservable> = this.getEntityPropertyChanged();
                if (signal) {
                    signal.generateSignal(this, propertyName, originalValue, newValue);
                }
            }
        }

    }
}