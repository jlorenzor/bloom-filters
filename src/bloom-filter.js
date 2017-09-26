/* file : bloom-filter.js
MIT License

Copyright (c) 2017 Thomas Minier & Arnaud Grall

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

const fm = require('./formulas.js')
const utils = require('./utils.js')
const Exportable = require('./exportable.js')

/**
 * A Bloom filter is a space-efficient probabilistic data structure, conceived by Burton Howard Bloom in 1970,
 * that is used to test whether an element is a member of a set. False positive matches are possible, but false negatives are not.
 *
 * Reference: Bloom, B. H. (1970). Space/time trade-offs in hash coding with allowable errors. Communications of the ACM, 13(7), 422-426.
 * @see {@link http://crystal.uta.edu/~mcguigan/cse6350/papers/Bloom.pdf} for more details about classic Bloom Filters.
 * @extends Exportable
 * @author Thomas Minier
 * @example
 * const BloomFilter = require('bloom-filters').BloomFilter;
 *
 * // create a Bloom Filter with capacity = 15 and 1% error rate
 * let filter = new BloomFilter(15, 0.1);
 *
 * // alternatively, create a Bloom Filter from an array with 1% error rate
 * filter = BloomFilter.from([ 'alice', 'bob' ], 0.1);
 *
 * // add some value in the filter
 * filter.add('alice');
 * filter.add('bob');
 *
 * // lookup for some data
 * console.log(filter.has('bob')); // output: true
 * console.log(filter.has('daniel')); // output: false
 *
 * // print false positive rate (around 0.1)
 * console.log(filter.rate());
 */
class BloomFilter extends Exportable {
  /**
   * Constructor
   * @param {int} capacity - The filter capacity, i.e. the maximum number of elements it will contains
   * @param {number} errorRate - The error rate, i.e. 'false positive' rate, targetted by the filter
   */
  constructor (capacity, errorRate) {
    super('BloomFilter', 'size', 'length', 'nbHashes', 'filter')
    this.size = fm.optimalFilterSize(capacity, errorRate)
    this.nbHashes = fm.optimalHashes(this.size, capacity)
    this.filter = utils.allocateArray(this.size, false)
    this.length = 0
  }

  /**
   * Build a new Bloom Filter from an existing array with a fixed error rate
   * @param {Array} array - The array used to build the filter
   * @param {number} errorRate - The error rate, i.e. 'false positive' rate, targetted by the filter
   * @return {BloomFilter} A new Bloom Filter filled with iterable's elements
   * @example
   * // create a filter with a false positive rate of 0.1
   * const filter = BloomFilter.from(['alice', 'bob', 'carl'], 0.1);
   */
  static from (array, errorRate) {
    const filter = new BloomFilter(array.length, errorRate)
    array.forEach(element => filter.add(element))
    return filter
  }

  /**
   * Create a new Bloom Filter from a JSON export
   * @param  {Object} json - A JSON export of a Bloom Filter
   * @return {BloomFilter} A new Bloom Filter
   */
  static fromJSON (json) {
    if ((json.type !== 'BloomFilter') || !('size' in json) || !('length' in json) || !('nbHashes' in json) || !('filter' in json)) { throw new Error('Cannot create a BloomFilter from a JSON export which does not represent a bloom filter') }
    const filter = new BloomFilter(1, 0.1)
    filter.size = json.size
    filter.nbHashes = json.nbHashes
    filter.filter = json.filter.slice(0)
    filter.length = json.length
    return filter
  }

  /**
   * Add an element to the filter
   * @param {*} element - The element to add
   * @return {void}
   * @example
   * const filter = new BloomFilter(15, 0.1);
   * filter.add('foo');
   */
  add (element) {
    const hashes = utils.hashTwice(element, true)

    for (let i = 0; i < this.nbHashes; i++) {
      this.filter[utils.doubleHashing(i, hashes.first, hashes.second, this.size)] = true
    }
    this.length++
  }

  /**
   * Test an element for membership
   * @param {*} element - The element to look for in the filter
   * @return {boolean} False if the element is definitively not in the filter, True is the element might be in the filter
   * @example
   * const filter = new BloomFilter(15, 0.1);
   * filter.add('foo');
   * console.log(filter.has('foo')); // output: true
   * console.log(filter.has('bar')); // output: false
   */
  has (element) {
    const hashes = utils.hashTwice(element, true)

    for (let i = 0; i < this.nbHashes; i++) {
      if (!this.filter[utils.doubleHashing(i, hashes.first, hashes.second, this.size)]) {
        return false
      }
    }
    return true
  }

  /**
   * Get the current false positive rate (or error rate) of the filter
   * @return {int} The current false positive rate of the filter
   * @example
   * const filter = new BloomFilter(15, 0.1);
   * console.log(filter.rate()); // output: something around 0.1
   */
  rate () {
    return Math.pow(1 - Math.exp((-this.nbHashes * this.length) / this.size), this.nbHashes)
  }
}

module.exports = BloomFilter
