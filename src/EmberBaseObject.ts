/// <reference path='../typings/ember/ember.d.ts' />
/// <reference path='../typings/lodash/lodash.d.ts' />

module ynab.common {

    'use strict';

    /**
     * EmberBaseObject is a base class that you can inherit from in Typescript.
     * It provides your derived class with a _static_ method "create", from which you can create
     * instances of your class.
     * Note: Using the normal constructor for your class is not supported, and will throw an exceotion.
     *
     * Sometimes you will need to modify your class prototype before the first instance is created
     * To do that, create a static function called `emberPrototypeConstructor`, like so:
     *
     * export class MyClass {
     *    protected static emberPrototypeConstructor() {
     *       var classPrototype:MyClass = (<typeof MyClass>this).prototype;
     *       // You are now free to modify the functions defined on this prototype.
     *       // Say you want to modify a method defined on the prototype to be a computed property:
     *       classPrototype.myComputedProperty = <any>classPrototype.myComputedProperty.property("dependentProperty").readOnly();
     *       }
     * }
     *
     * More examples can be found in the project readme.
     */
    export class EmberBaseObject {

        /**
         * You can optionally pass in a type to explicitly show that this Type is going to be returned
         * for example:
         * var instance:MyDerivedClass = MyDerivedClass.createEmberInstance<MyDerivedClass>();
         */
        public static createInstance<T extends EmberBaseObject>(initialValues?: {}): T {
            return this.createAsEmberObject<T>(initialValues);
        }

        public constructor() {
            // Nothing to do here really
            // Let's just make sure that they are not just calling 'new MyClass()' but are using the EmberBaseObject methods instead
            --EmberBaseObject._constructorSentinalCounter;
            if (EmberBaseObject._constructorSentinalCounter < 0) {
                // First, we prop it back up to where it was so that we don't prevent EVERY object from being created from now on
                ++EmberBaseObject._constructorSentinalCounter;
                var className = <string>this.constructor["name"];
                // Not all browsers (IE) support the name property
                if (!className || className == undefined) {
                    className = "ClassName";
                }
                throw new Error(`This class must be constructed using '${className}.createInstance()'. You can't just call 'new ${className}()' on it.`);
            }//asdfsdf
        }

        // This is protected so that derived classes can override createInstance and make use of this method if they really want to.
        // You probably just want to be calling createInstance though.
        protected static createAsEmberObject<T extends EmberBaseObject>(initialValues?: {}): T {

            return this.getEmberClass().create<T>(initialValues);
        }

        // Note: There will be a different _emberClass variable for each type on which you call "getEmberClass"
        // So, if you call BaseClass.getEmberClass() you'll get a different class than if you call DerivedClass.getEmberClass()
        private static _emberClass: typeof Ember.Object;

        // This is a sentinal to determine whether we're calling this object's constructor directly or are using the 'create' method as we should
        protected static _constructorSentinalCounter: number = 0;

        /// Gets all of the prototypes in the inheritance chain, starting with the base class (excluding the default Object prototype)
        /// and ending with the most derived class
        protected static getAllPrototypesFromBaseToMostDerived(): Array<Object> {

            var retVal: Array<Object> = [];
            var curPrototype: any = (<any>this).prototype;

            // We keep pushing prototypes onto the result until our next prototype is null
            // That means we've reached the "Object" prototype, so it's not necessary to put on the chain
            while (curPrototype) {
                var nextPrototype: any = Object.getPrototypeOf(curPrototype);
                if (nextPrototype) {
                    retVal.push(curPrototype);
                }
                curPrototype = nextPrototype;
            }

            retVal = retVal.reverse();
            return retVal;
        }

        protected static callStaticMethodOnAllPrototypeObjects(prototypeChain: Array<Object>, staticMethodToCall: string): void {

            // We start with our base prototype and call that one first. Then we go to our next class.
            // That means we walk from base classes down to derived classes.
            // That way, derived prototype functions/properties will correctly override the base properties of the same name
            for (var x: number = 0; x < prototypeChain.length; ++x) {

                var currentPrototype: any = prototypeChain[x];
                var classConstructor: any = currentPrototype.constructor;
                if (classConstructor) {

                    var staticMethod: Function = classConstructor[staticMethodToCall];
                    if (staticMethod && !(<any>staticMethod).__hasBeenCalledYet) {

                        (<any>staticMethod).__hasBeenCalledYet = true;
                        // We use the constructor for the "this" parameter
                        // That way, if you're in SomeClass::emberPrototypeConstructor
                        // The "this" will be SomeClass and not something else.
                        staticMethod.apply(currentPrototype.constructor);
                    }
                }
            }
        }

        private static callAllEmberPrototypeConstructorsInInheritanceChain(prototypeChain: Array<Object>): void {
            EmberBaseObject.callStaticMethodOnAllPrototypeObjects(prototypeChain, "emberPrototypeConstructor");
        }

        private static getEmberClass(): typeof Ember.Object {

            // In a static method, "this" is the class on which we are calling "getEmberClass"
            // So if you call MyClass.getEmberClass, "this" will be "MyClass", and
            // MyClass._emberClass is different than SomeOtherClass._emberClass
            if (!this._emberClass) {

                var allPrototypes: Array<Object> = this.getAllPrototypesFromBaseToMostDerived();
                this.callAllEmberPrototypeConstructorsInInheritanceChain(allPrototypes);

                // All Typescript types have a prototype field we can reference
                var firstPrototype: any = (<any>this).prototype;
                var typescriptConstructor: Function = firstPrototype.constructor;
                // Ember will call the init function on an object
                // So, we need to make sure that this object has an "init" function
                // That will call the typescript constructor, if there is one
                if (typeof (typescriptConstructor) !== "undefined") {
                    // Have they already defined an "init" method? Let's make sure we don't override it
                    if (typeof (firstPrototype["init"]) !== "undefined") {
                        throw new Error("You cannot define an 'init' method on this object. Use a normal typescript constructor instead.");
                    }
                    firstPrototype["init"] = typescriptConstructor;
                }

                this._emberClass = <typeof Ember.Object>Ember.Object.extend({});

                // To set this object's name in Ember, we have two options:
                // 1: Use namespaces. We could add each of these classes to a namespace like EmberObjects
                // Then, we'd call Ember.processNamespace on the namespace
                // However, that does a linear search through the namespace each time you process it,
                // so I'd rather not do that with every object we create.
                //
                // 2: Just fake it and do what Ember would do.
                // That's what the below does. It sets the toString method to be the className, and also
                // sets a magic class[Ember.NAME_KEY].
                // Ember appears to use these to get the name of the object at runtime.
                // To see where I copied this code, have a look at the `processNamespace` method in Ember.

                // `name` is an ES6 feature. It might very well not exist, but if you're debugging in a modern
                // browser, this is still helpful.
                var className = <string>this["name"];
                if (className) {
                    this._emberClass.toString = function() {
                        return className;
                    }
                    this._emberClass[Ember.NAME_KEY] = className;
                }

                // We walk from our deepest prototype up to our top prototype
                // That means we walk from base classes down to derived classes
                // That way, derived prototype functions/properties will correctly override the base properties of
                // the same name
                for (var x: number = 0; x < allPrototypes.length; ++x) {

                    var currentPrototype = allPrototypes[x];
                    // TODO: This copy is probably overly cautious. It used to be necessary when I was maniupulating
                    // this particular prototype here, but I am no longer.
                    currentPrototype = Ember.copy(currentPrototype, false);
                    this._emberClass.reopen(currentPrototype);
                }

                this._emberClass["__originalEmberCreate"] = this._emberClass.create;
                var emberClass = this._emberClass;
                this._emberClass.create = function(initialValues?: {}): any {

                    // We have to create the object in Ember and THEN initialize it
                    // That's because the way Ember does the initialization interferes with the way the Typescript
                    // constructors work. If we rely only upon Ember to do the initialization, we miss out on the ability
                    // for the TypeScript object to do the initialization

                    // We always add one to this right before we construct, and then the constructor removes 1 from it
                    // If we ever remove more than we add, we know that at some point, someone has called 'new' on this
                    // object instead of using the `createInstance` method.
                    ++EmberBaseObject._constructorSentinalCounter;
                    var retVal: Ember.Object = emberClass["__originalEmberCreate"]();

                    EmberBaseObject.createMandatorySettersForObject(retVal);
                    EmberBaseObject.initializeObjectWithValues(retVal, initialValues);

                    return retVal;
                }
            }
            return this._emberClass;
        }

        // This is basically a copy-paste from Ember 1.10
        private static handleMandatorySetter(metaValues : {}, obj: Ember.Object, keyName: string): boolean {

            // In normal Ember object creation, this function runs early on in object creation time.
            // However, when Ember is creating our Typescript objects, it doesn't get a chance to define
            // properties that typescript initializes.
            // If Ember is using mandatory setters, we need to set up MandatorySetters on our object
            // (We used to just turn mandatory setters off, but that is no longer an option because the Ember
            // team compiles that setting in)

            function getSetterFunction(keyName: string) {
                return function SETTER_FUNCTION(value:any) {
                    Ember.assert(`You must use the 'set()' method to set the '${keyName}' property (of ${obj}) to '${value}'.`, false);
                };
            }

            // Here we need to define the getter function for this property so that it knows to return meta.values[key] instead of the underlying value
            function getGetterFunction(keyName: string) {
                return function GETTER_FUNCTION() {
                    var meta = obj['__ember_meta__'];
                    return meta && meta.values[keyName];
                };
            }


            var descriptor = Object.getOwnPropertyDescriptor && Object.getOwnPropertyDescriptor(obj, keyName);
            var configurable = descriptor ? descriptor.configurable : true;
            var isWritable = descriptor ? descriptor.writable : true;
            var hasValue = descriptor ? 'value' in descriptor : true;
            var possibleDesc = descriptor && descriptor.value;
            var isDescriptor = possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor;

            if (isDescriptor) {
                throw new Error("isDescriptor for " + keyName);
            }

            // this x in Y deopts, so keeping it in this function is better;
            if (configurable && isWritable && hasValue) {
                if (keyName in obj) {
                    metaValues[keyName] = obj[keyName];
                    Object.defineProperty(obj, keyName, {
                        configurable: true,
                        enumerable: Object.prototype.propertyIsEnumerable.call(obj, keyName),
                        set: getSetterFunction(keyName),
                        get: getGetterFunction(keyName)
                    });
                    return true;
                } else {
                    throw new Error("Property '" + keyName + "' doesn't exist on " + obj + ". Are you observing a property that isn't defined?");
                }
            } else {
                return false;
            }

            // More details about the above:

            // In Ember's set function, it first looks to make sure that obj[key] != the new value we're setting it to
            // But if we haven't defined a getter for obj[key], it will look directly at the object's property value instead
            // of looking at meta.values. (meta.values are where the mandatory-setter system shadows all property values)

            // So, imagine you had an observed property called "stringProp" with a value of "foo"
            // That value is actually stored in meta.values["stringProp"], although obj["stringProp"] will still happen to have a value
            // obj["stringProp"] is what the set method will accidentally look at when determining if it can early-out of the set function
            // So, imagine you're trying to set obj["stringProp"] back to null, and obj["stringProp"] happens to still be null,
            // but meta.values["stringProp"] isn't.
            // Ember will conclude there is nothing to do, and your set won't actually happen!
        }

        private static createMandatorySettersForObject(obj: Ember.Object): void {

            // If we're in development mode, we need to work around a bug in Ember's mandatory-setter,
            // As I reported here: https://github.com/emberjs/ember.js/issues/10252
            // Basically, if we're watching properties that are only defined in Typescript,
            // and have never had `.set` called for them, Ember will return `undefined` for their value because
            // their values haven't been shadowed in meta.values yet

            // In addition, there is a separate issue (see below)
            var meta: Object = obj['__ember_meta__'];
            if (meta) {
                // These values are only there if we are in Ember debug mode, and have mandatory setters on
                var values: Object = meta["values"];
                if (values) {
                    var watching: Object = meta["watching"];
                    if (watching) {

                        // If you don't use lodash or underscore, you can make this a simpler "for in" loop instead
                        // We use lodash, and it's "faster", so this is what we do:
                        _.forIn(watching, (value: any, keyName: string) => {
                            // If we had a normal Ember object, we would have defined these properties in the prototype,
                            // and Ember would have already defined this property's getters and setters to prevent writing directly to it.
                            // (Because of mandatory-setter)
                            // But even if we could convince ember to create these setters/getters for us, we wouldn't want to.
                            // That's because Typescript constructors just call set directly on the properties, and having a mandatory setter
                            // function for those properties would prevent that from happening
                            // So we now create these getter/setters ourselves AFTER the Typescript has run

                            var successful = EmberBaseObject.handleMandatorySetter(values, obj, keyName);
                            if (!successful) {
                                // I think this is bad if this doesn't happen, so we're going to freak out
                                throw new Error(`Could not set up the mandatory setter for ${obj} : ${keyName}`);
                            }
                        });
                    }
                }
            }
        }

        protected static initializeObjectWithValues(objToInitialize: { set: (prop: string, val: any) => void }, initialValues?: {}): void {

            if (typeof (initialValues) !== "undefined") {
                for (var tempProp in initialValues) {
                    if (initialValues.hasOwnProperty(tempProp)) {
                        objToInitialize.set(tempProp, initialValues[tempProp]);
                    }
                }
            }
        }

        /**
         * Called by Ember when a property is requested that is unknown to Ember
         * Used to warn that this is most likely a mistake.
         * The most common way that this happens is declaring a property in Typescript without initializing it.
         * Wrong: public val : number;
         * Right: public val : number = 5;
         *
         * @param propName
         * @returns {undefined}
         */
        // I have commented out for now since not everyone will want this
        /*private unknownProperty(propName: string, value: any): any {

            // If we're here, it's because a "get" just returned a value of "undefined"
            // There are only two ways that can happen:
            // 1) We are trying to "get" a value that we haven't assigned a value yet,
            // 2) We misspelled the name of the value we're trying to get
            // Either way, this is a great way to make sure that we are not making a dumb mistake
            // So, we warn about it

            // isTruthy is called a lot on objects by handleBars/Ember, and it's not worthy of a warning
            if (propName !== "isTruthy")
                ynab.utilities.ConsoleUtilities.warning(`An unknown property is being get : '${this}.${propName}. The property name is either misspelled, or you forgot to give it a default value in the Typescript class.`);

            return undefined;
        }*/

        /**
         * Called by Ember when a property is set that is unknown to Ember
         * Used to warn that this is most likely a mistake.
         * The most common way that this happens is declaring a property in Typescript without initializing it.
         * Wrong: public val : number;
         * Right: public val : number = 5;
         *
         * @param propName
         * @returns {undefined}
         */
        private setUnknownProperty(propName: string, value: any): any {

            // If we're here, it's because we're trying to set a property that doesn't exist on the object
            // This is a great way to make sure that we are not making a dumb mistake
            // So, we warn about it

            //ynab.utilities.ConsoleUtilities.warning(`An unknown property is being set : '${this}.${propName}' The property name is either misspelled, or you forgot to give it a default value in the Typescript class.\n` +
            //    'It will be defined as normal, but you should fix this.');

            this[propName] = value;
            return value;
        }

        protected static emberPrototypeConstructor() {

            // Get rid of the "fake" get and set methods defined below
            var prototype: EmberBaseObject = (<typeof EmberBaseObject>this).prototype;
            delete prototype['get'];
            delete prototype['set'];
        }


        // The get and set methods tell the Typescript compiler that instances of this class will indeed have these methods at runtime.
        // They are also there to catch us if we just create this object with `new` instead of using `create`

        //The following method will be replaced at runtime by Ember.Object.get
        public get(propName: string): any {
            throw new Error("If you are in this 'get' method, you've done something wrong. You probably forgot to use the static 'create' method.");
        }

        //The following method will be replaced at runtime by Ember.Object.set
        public set(propName: string, value: any): void {
            throw new Error("If you are in this 'set' method, you've done something wrong. You probably forgot to use the static 'create' method.");
        }

        // Other methods that will be available on this instance at runtime
        // (Taken from ember.d.ts in the DefinitelyTyped project)
        public addObserver: () => ModifyObserver;
        public beginPropertyChanges: () => Ember.Observable;
        public cacheFor: (keyName: string) => any;
        public decrementProperty: (keyName: string, decrement?: number) => number;
        public endPropertyChanges: () => Ember.Observable;
        public getProperties: (...args: string[]) => {};
        // There are two potential signatures for getProperties, and I'm not sure how to declare this
        // overloaded signature when declaring methods like this.
        //public getProperties:(keys: string[])=> {};
        public getWithDefault: (keyName: string, defaultValue: any) => any;
        public hasObserverFor: (key: string) => boolean;
        public incrementProperty: (keyName: string, increment?: number) => number;
        public notifyPropertyChange: (keyName: string) => Ember.Observable;
        public propertyDidChange: (keyName: string) => Ember.Observable;
        public propertyWillChange: (keyName: string) => Ember.Observable;
        public removeObserver: (key: string, target: any, method: string | Function) => Ember.Observable;
        public setProperties: (hash: {}) => Ember.Observable;
        public toggleProperty: (keyName: string) => any;
    }
}
