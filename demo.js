const origin = {
	num: 15,
}
const gen = {
	provides: origin,
	parent: null,
}

const b = {
	provides: this.parent ? parent.provides : origin,
	parent: gen,
}
const a = {
	provides: {
		count: 1,
	},
	parent: gen,
}

const c = {
	provides: this.parent ? parent.provides : origin,
	parent: a,
}

if (gen.provides === a.provides) {
	a.provides = Object.create(gen.provides)
}

console.log(a.provides.num, a.provides.count)
