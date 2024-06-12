pragma solidity ^0.8.2;

contract Foo {
  Bar bar;
  constructor() {
    bar = new Bar();
  }

  function callBar() public {
      bar.noop();
  }
}

contract Bar {
  function noop() public { }
}