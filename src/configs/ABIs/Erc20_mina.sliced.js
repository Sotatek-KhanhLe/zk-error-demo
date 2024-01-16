/* eslint-disable max-statements */
/* eslint-disable max-lines */
/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
      return Reflect.metadata(k, v);
  };
import {
  AccountUpdate,
  Bool,
  SmartContract,
  method,
  PublicKey,
  UInt64,
  state,
  State,
  Field,
  Struct,
} from 'o1js';
// eslint-disable-next-line max-len
// eslint-disable-next-line no-duplicate-imports, @typescript-eslint/consistent-type-imports
import errors from './errors.js';
import { AdminAction } from './interfaces/token/adminable.js';
import Hooks from './Hooks.js';
class Transfer extends Struct({
  from: PublicKey,
  to: PublicKey,
  amount: UInt64,
}) {
  constructor(from, to, amount) {
    super({ from, to, amount });
  }
}
class Lock extends Struct({
  locker: PublicKey,
  receipt: Field,
  amount: UInt64,
}) {
  constructor(locker, receipt, amount) {
    super({ locker, receipt, amount });
  }
}
class Token extends SmartContract {
  constructor() {
    super(...arguments);
    this.hooks = State();
    this.totalSupply = State();
    this.circulatingSupply = State();
    this.paused = State();
    this.decimals = UInt64.from(Token.defaultDecimals);
    this.events = { Transfer: Transfer, Lock: Lock };
  }
  getHooksContract() {
    const admin = this.getHooks();
    return new Hooks(admin);
  }
  initialize(hooks, totalSupply) {
    super.init();
    this.account.provedState.assertEquals(Bool(false));
    this.hooks.set(hooks);
    this.totalSupply.set(totalSupply);
    this.circulatingSupply.set(UInt64.from(0));
    this.paused.set(Bool(false));
  }
  /**
   * Mintable
   */
  mint(to, amount) {
    const hooksContract = this.getHooksContract();
    hooksContract.canAdmin(AdminAction.fromType(AdminAction.types.mint));
    const totalSupply = this.getTotalSupply();
    const circulatingSupply = this.getCirculatingSupply();
    const newCirculatingSupply = circulatingSupply.add(amount);
    newCirculatingSupply.assertLessThanOrEqual(
      totalSupply,
      errors.mintAmountExceedsTotalSupply
    );
    // eslint-disable-next-line no-warning-comments
    // TODO: find out why amount can't be Int64, also for burn
    // eslint-disable-next-line putout/putout
    return this.token.mint({ address: to, amount });
  }
  setTotalSupply(amount) {
    const hooksContract = this.getHooksContract();
    hooksContract.canAdmin(
      AdminAction.fromType(AdminAction.types.setTotalSupply)
    );
    this.totalSupply.set(amount);
  }
  /**
   * Burnable
   */
  burn(from, amount) {
    const hooksContract = this.getHooksContract();
    hooksContract.canAdmin(AdminAction.fromType(AdminAction.types.burn));
    // eslint-disable-next-line putout/putout
    return this.token.mint({ address: from, amount });
  }

  lock(receipt, bridgeAddress, amount) {
    // this.token.send({ from: this.sender, to: bridgeAddress, amount })
    this.burn(this.sender, amount);
    this.emitEvent('Lock', {
      locker: this.sender,
      receipt,
      amount,
    });
  }

  /**
   * Viewable
   */
  getTotalSupply({ preconditions } = Token.defaultViewableOptions) {
    const totalSupply = this.totalSupply.get();
    if (preconditions.shouldAssertEquals) {
      this.totalSupply.assertEquals(totalSupply);
    }
    return totalSupply;
  }
  getCirculatingSupply({ preconditions } = Token.defaultViewableOptions) {
    const circulatingSupply = this.circulatingSupply.get();
    if (preconditions.shouldAssertEquals) {
      this.circulatingSupply.assertEquals(circulatingSupply);
    }
    return circulatingSupply;
  }
  getHooks({ preconditions } = Token.defaultViewableOptions) {
    const hooks = this.hooks.get();
    if (preconditions.shouldAssertEquals) {
      this.hooks.assertEquals(hooks);
    }
    return hooks;
  }
}
Token.defaultViewableOptions = {
  preconditions: { shouldAssertEquals: true },
};
// eslint-disable-next-line no-warning-comments
// TODO: check how many decimals mina has by default
Token.defaultDecimals = 9;
__decorate(
  [state(PublicKey), __metadata('design:type', Object)],
  Token.prototype,
  'hooks',
  void 0
);
__decorate(
  [state(UInt64), __metadata('design:type', Object)],
  Token.prototype,
  'totalSupply',
  void 0
);
__decorate(
  [state(UInt64), __metadata('design:type', Object)],
  Token.prototype,
  'circulatingSupply',
  void 0
);
__decorate(
  [state(Bool), __metadata('design:type', Object)],
  Token.prototype,
  'paused',
  void 0
);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [PublicKey, UInt64]),
    __metadata('design:returntype', void 0),
  ],
  Token.prototype,
  'initialize',
  null
);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [PublicKey, UInt64]),
    __metadata('design:returntype', AccountUpdate),
  ],
  Token.prototype,
  'mint',
  null
);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [UInt64]),
    __metadata('design:returntype', void 0),
  ],
  Token.prototype,
  'setTotalSupply',
  null
);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [PublicKey, UInt64]),
    __metadata('design:returntype', AccountUpdate),
  ],
  Token.prototype,
  'burn',
  null
);

__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Field, PublicKey, UInt64]),
    __metadata('design:returntype', void 0),
  ],
  Token.prototype,
  'lock',
  null
);

export default Token;
//# sourceMappingURL=token.js.map
