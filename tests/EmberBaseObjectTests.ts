/// <reference path='../bin/EmberBaseObject.d.ts' />
/// <reference path='../typings/mocha/mocha.d.ts' />
/// <reference path='../typings/chai/chai.d.ts' />

module ynab.tests {
    'use strict';

    class TestClass extends ynab.common.EmberBaseObject {

        public observedStringProp: string = "foo";
        public observedStringProp2: string = "bar";
        public nonObservedProperty: string = "foo";
        public observedBooleanProp: boolean = false;

        public static create(initialValues?: {}): TestClass {
            return this.createInstance<TestClass>(initialValues);
        }

        private calculatedProp(): string {
            return this.get("observedStringProp") + this.get("observedStringProp2");
        }

        private metaCalculatedProp(): string {
            return this.get("calculatedProp") + this.get("observedStringProp2");
        }

        public getCalculatedProp(): string {
            return this.get("calculatedProp");
        }

        public getMetaCalculatedProp(): string {
            return this.get("metaCalculatedProp");
        }

        protected static emberPrototypeConstructor() {

            var prototype: TestClass = (<typeof TestClass>this).prototype;
            prototype.calculatedProp = (<any>prototype.calculatedProp.property("observedStringProp", "observedStringProp2")).readOnly();
            prototype.metaCalculatedProp = (<any>prototype.metaCalculatedProp.property("calculatedProp")).readOnly();
        }

    }

    class Person extends ynab.common.EmberBaseObject {

        public static create(initialValues?: {}): Person {
            return this.createInstance<Person>(initialValues);
        }

        private firstName: string = null;
        public getFirstName(): string { return this.get('firstName'); }
        public setFirstName(value: string): void { this.set('firstName', value); }

        private lastName: string = null;
        public getLastName(): string { return this.get('lastName'); }
        public setLastName(value: string): void { this.set('lastName', value); }

        // The function that actually does the computing
        // Ember makes sure this is only called as often as is necesary
        private fullName(): string {
            return `${this.getFirstName()} ${this.getLastName()}`;
        }

        // This is the function you'll call from typescript
        public getFullName() : string{
            // By using the get method, Ember will cache this value for us
            // and only recaclulate it if it changes
            return this.get('fullName');
        }

        protected static emberPrototypeConstructor() {

            var prototype: Person = (<typeof Person>this).prototype;
            // Tell Ember that the fullName property depends upon the firstName and lastName properties
            prototype.fullName = (<any>prototype.fullName.property("firstName", "lastName")).readOnly();
        }
    }

    export class EmberBaseObjectTests {

        public static performTests(): void {

            var expect = chai.expect;

            it("Should allow properties to be initialized in the object constructor.", function() {

                var tom = Person.create({ firstName: 'Tom', lastName: 'Dale' });

                expect(tom.get('firstName')).to.equal('Tom');
                expect(tom.get('lastName')).to.equal('Dale');

                expect(tom.get('fullName')).to.equal('Tom Dale');
            });

            it("Should allow computed properties to work.", function() {

                var person = Person.create({});

                person.setFirstName('Yehuda');
                person.setLastName('Katz');
                // First, expect this property to just be what it was initialized as
                expect(person.getFirstName()).to.equal('Yehuda');
                expect(person.getLastName()).to.equal('Katz');

                expect(person.getFullName()).to.equal('Yehuda Katz');

                expect(person.setFirstName('Taylor'));
                expect(person.getFullName()).to.equal('Taylor Katz');

                expect(person.setLastName('Brown'));
                expect(person.getFullName()).to.equal('Taylor Brown');
            });

            it("Should allow for the basic get and set method to work.", function() {

                var person = Person.create({ firstName: 'Yehuda', lastName: 'Katz' });

                expect(person.get('firstName')).to.equal('Yehuda');
                expect(person.get('lastName')).to.equal('Katz');

                expect(person.get('fullName')).to.equal('Yehuda Katz');

                expect(person.set('firstName', 'Taylor'));
                expect(person.get('fullName')).to.equal('Taylor Katz');

                expect(person.set('lastName', 'Brown'));
                expect(person.get('fullName')).to.equal('Taylor Brown');
            });

            // This won't work until this bug is addressed by the Ember team:
            // https://github.com/emberjs/ember.js/issues/10252
            it.skip("Ember itself should allow for properties to be defined and watched, even if the property is set at creation time. (Skipped until issue 10252 is fixed in Ember)", function() {

                var Person = Ember.Object.extend({
                    // these will be supplied by `create`
                    firstName: null,

                    fullName: function() {
                        var firstName = this.get('firstName');
                        var lastName = this.get('lastName');

                        return firstName + ' ' + lastName;
                    }.property('firstName', 'lastName'),

                    fullNameChanged: function() {
                    }.observes('fullName').on('init'),

                    lastNameChanged: function() {
                    }.observes('lastName')
                });


                var person = Person["create"]({
                    firstName: 'Yehuda'
                });

                // This is wrong, but is undetected by Ember (which makes sense):
                person.lastName = 'Katz';

                // But since lastName is being watched, and mandatory-setters is on, the following will return undefined:
                expect(person.get('lastName')).to.equal('Katz');

                expect(person.get('fullName')).to.equal('Yehuda Katz');
                person.set('lastName', 'Katz');
                expect(person.lastName).to.equal('Katz');
                expect(person.get('lastName')).to.equal('Katz');

                expect(person.get('fullName')).to.equal('Yehuda Katz');
                person.set('lastName', 'Foo');
                expect(person.get('fullName')).to.equal('Yehuda Foo');
            });

            it("Should allow for string properties to be defined and watched, even if the property is first set the EmberBaseObject/Typescript way.", function() {

                // Note that on the stock version of Ember, the following test doesn't work
                // That's because:
                // If you add a watcher to a property that isn't yet defined on an object,
                // which is what happens when Typescript creates properties on objects at construction time,
                // Ember skips creating the mandatory setter, and skips creating an entry in the `meta.values` for that property
                // Then, when you try to `get` the property, Ember returns `meta.values[propName]`, which is undefined
                // I've fixed this in EmberCreateable, but you can also
                // fix this by running in Ember's production mode, or by compiling without MANDATORY_SETTERS defined
                var testInstance: TestClass = TestClass.create({});

                // First, expect this property to just be what it was initialized as
                expect(testInstance.get('observedStringProp')).to.equal('foo');
                // Now, set it to something else
                testInstance.set('observedStringProp', "bar");
                // Expect that it's changed
                expect(testInstance.get('observedStringProp')).to.equal('bar');
            });

            it("Should allow for watched properties to be set to their original value, even if the property is first set the EmberBaseObject/Typescript way.", function() {

                // We ran into a bug (see: https://github.com/ynab/evergreen/pull/736)
                // Where you could set a property to a value other than it's default, but then you couldn't set it back
                // See
                var testInstance: TestClass = TestClass.create({});

                // First, expect this property to just be what it was initialized as
                expect(testInstance.get('observedBooleanProp')).to.equal(false);
                // Now, set it to something else
                testInstance.set('observedBooleanProp', true);
                // Expect that it's changed
                expect(testInstance.get('observedBooleanProp')).to.equal(true);
                // Now, set it back to its original value
                testInstance.set('observedBooleanProp', false);
                expect(testInstance.get('observedBooleanProp')).to.equal(false);
            });

            it("Ember itself should allow for computed properties to be defined as dependent upon other properties.", function() {

                // This shouldn't fail - it's really a test of Ember, but I like having it here as a reference, and to make sure that
                // nothing changes about the way we expect Ember to work

                // First, let's make sure that Ember works the way we expect it to:
                var Person = Ember.Object.extend({
                    // these will be supplied by `create`
                    firstName: null,
                    lastName: null,

                    fullName: function() {
                        var firstName = this.get('firstName');
                        var lastName = this.get('lastName');

                        return firstName + ' ' + lastName;
                    }.property('firstName', 'lastName').readOnly(),

                    fullNameRepeated: function() {
                        return this.get("fullName") + "-" + this.get("fullName");
                    }.property('fullName').readOnly(),

                    fullNameChanged: function() {
                    }.observes('fullName'),

                    lastNameChanged: function() {
                    }.observes('lastName')
                });

                var person = Person["create"]({
                    firstName: 'Yehuda',
                    lastName: 'Katz'
                });

                expect(person.get('lastName')).to.equal('Katz');

                expect(person.get('fullName')).to.equal('Yehuda Katz');
                expect(person.get('fullNameRepeated')).to.equal('Yehuda Katz-Yehuda Katz');

                person.set('lastName', 'Brown');
                expect(person.get('lastName')).to.equal('Brown');
                expect(person.get('fullNameRepeated')).to.equal('Yehuda Brown-Yehuda Brown');

                person.set('lastName', 'Foo');
                expect(person.get('fullName')).to.equal('Yehuda Foo');
                expect(person.get('fullNameRepeated')).to.equal('Yehuda Foo-Yehuda Foo');

            });

            it("EmberBaseObject should allow for computed properties to be defined as dependent upon other properties.", function() {

                // And now let's make sure that our own class works the way we expect it to
                var testInstance: TestClass = TestClass.create({});

                expect(testInstance.get('observedStringProp')).to.equal("foo");
                expect(testInstance.get('observedStringProp2')).to.equal("bar");
                expect(testInstance.getCalculatedProp()).to.equal("foobar");
                expect(testInstance.getMetaCalculatedProp()).to.equal("foobarbar");

                testInstance.set('observedStringProp', "baz");
                expect(testInstance.getCalculatedProp()).to.equal("bazbar");
                expect(testInstance.getMetaCalculatedProp()).to.equal("bazbarbar");

                testInstance.set('observedStringProp2', "foo");
                expect(testInstance.getCalculatedProp()).to.equal("bazfoo");
                expect(testInstance.getMetaCalculatedProp()).to.equal("bazfoofoo");
            });

            it("Should allow for observed properties to be initialized in the create method.", function() {

                // And now let's make sure that our own class works the way we expect it to
                var testInstance: TestClass = TestClass.create({
                    observedStringProp: "Hello",
                    observedStringProp2: "World",
                    nonObservedProperty: "Test",
                    observedBooleanProp: true
                });

                expect(testInstance.get('observedStringProp')).to.equal("Hello");
                expect(testInstance.get('observedStringProp2')).to.equal("World");
                expect(testInstance.get('nonObservedProperty')).to.equal("Test");
                expect(testInstance.get('observedBooleanProp')).to.equal(true);
                expect(testInstance.getCalculatedProp()).to.equal("HelloWorld");
                expect(testInstance.getMetaCalculatedProp()).to.equal("HelloWorldWorld");

                testInstance.set('observedStringProp', "baz");
                expect(testInstance.getCalculatedProp()).to.equal("bazWorld");
                expect(testInstance.getMetaCalculatedProp()).to.equal("bazWorldWorld");

                testInstance.set('observedStringProp2', "foo");
                expect(testInstance.getCalculatedProp()).to.equal("bazfoo");
                expect(testInstance.getMetaCalculatedProp()).to.equal("bazfoofoo");

                testInstance.set('nonObservedProperty', "blah");
                expect(testInstance.get('nonObservedProperty')).to.equal("blah");

                testInstance.set('observedBooleanProp', false);
                expect(testInstance.get('observedBooleanProp')).to.equal(false);
            });

            it("Should prevent creating the object with `new`.", function() {

                // And now let's make sure that our own class works the way we expect it to
                expect(() => {
                    var testInstance: TestClass = new TestClass();
                }).to.throw(/must be constructed/);
            });


        }
    }
}