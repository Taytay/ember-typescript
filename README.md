
Ember-Typescript
====================

Define Ember.Objects using Typescript's class syntax. Now you have type-safe Ember.Objects.

## Requirements:

* Ember 1.10+
* Typescript 1.4+

## Example:

```typescript
class Person extends ynab.common.EmberBaseObject {

    public static create(initialValues?: {}): Person {
        return this.createInstance<Person>(initialValues);
    }

    // Make these private so you aren't tempted to get and set them directly
    private firstName: string = null;
    private lastName: string = null;

    // Ember makes sure this is only called as often as is necesary
    private fullName(): string {
        return `${this.getFirstName()} ${this.getLastName()}`;
    }

    protected static emberPrototypeConstructor() {

        // Since we can't actually call .property on the function definition (see comments above),
        // we need to do a bit of setup here:
        var prototype: Person = (<typeof Person>this).prototype;
        // Tell Ember that the fullName property depends upon the firstName and lastName properties
        prototype.fullName = (<any>prototype.fullName.property("firstName", "lastName")).readOnly();
    }
}

var person = Person.create({firstName:'Yehuda', lastName:'Katz'});

expect(person.get('firstName')).to.equal('Yehuda');
expect(person.get('lastName')).to.equal('Katz');

expect(person.get('fullName')).to.equal('Yehuda Katz');

expect(person.set('firstName', 'Taylor'));
expect(person.get('fullName')).to.equal('Taylor Katz');

expect(person.set('lastName', 'Brown'));
expect(person.get('fullName')).to.equal('Taylor Brown');

```

But the above ignores all of the nice Type safety that Typescript gives us,
so you can add getter/setter methods to make sure you never misspell a property name:

```typescript
class Person extends ynab.common.EmberBaseObject {

    public static create(initialValues?: {}): Person {
        return this.createInstance<Person>(initialValues);
    }

    private firstName: string = 'Yehuda';
    public getFirstName(): string { return this.get('firstName'); }
    public setFirstName(value: string): void { this.set('firstName', value); }

    private lastName: string = 'Katz';
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

// And now you use it like this:
var person = Person.create({firstName:'Yehuda', lastName:'Katz'});

// First, expect this property to just be what it was initialized as
expect(person.getFirstName()).to.equal('Yehuda');
expect(person.getLastName()).to.equal('Katz');

expect(person.getFullName()).to.equal('Yehuda Katz');

expect(person.setFirstName('Taylor'));
expect(person.getFullName()).to.equal('Taylor Katz');

expect(person.setLastName('Brown'));
expect(person.getFullName()).to.equal('Taylor Brown');

```

(This class is written as in internal module, but would be trivial to change to an external module instead.
Suggestions welcome if there is another best practice out there.)

## Motivation

We love two things: Ember and Typescript. I wanted to use Typescript's type-safe object syntax,
without having to give up on Ember's object model. So, I made this class.

## Installation

`git clone <this repo>`

## Building

`./compile.sh`

## Testing

```
./compile.sh
npm test
```

(Still could use more tests for edge cases)

## Author

Taylor Brown
@thetaytay

While happily employeed by You Need a Budget, LLC

## License

MIT Licensed. Have fun.