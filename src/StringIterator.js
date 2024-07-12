module.exports = function (s) {
    var cursor = 0;
    this.current = () => s.charAt(cursor);
    this.peek = () => s.charAt(cursor + 1);
    this.next = () => cursor += 1;
    this.end = () => cursor >= s.length - 1;
}