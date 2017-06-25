app.service('cpu', ['opcodes', 'memory', function(opcodes, memory) {
    var cpu = {
        step: function() {
            var self = this;

            if (self.fault === true) {
                throw 'FAULT. Reset to continue.';
            }

            try {
                var checkGPR = function(reg) {
                    if (reg < 0 || reg >= self.gpr.length) {
                        throw 'Invalid register: ' + reg;
                    } else {
                        return reg;
                    }
                };

                var checkGPR_SP = function(reg) {
                    if (reg < 0 || reg >= 1 + self.gpr.length) {
                        throw 'Invalid register: ' + reg;
                    } else {
                        return reg;
                    }
                };

                var setGPR_SP = function(reg, value, size)
                {
                    if(reg >= 0 && reg < self.gpr.length) {
                        if (size > 1)
                            self.gpr[reg] = value;
                        else
                            self.gpr[reg] = (self.gpr[reg] & 0xff00) | value & 0xff;
                    } else if(reg == self.gpr.length) {
                        if (size > 1)
                            self.sp = value;
                        else
                            self.sp = (self.sp & 0xff00) | value & 0xff;

                        // Not likely to happen, since we always get here after checkOpertion().
                        if (self.sp < self.minSP) {
                            throw 'Stack overflow';
                        } else if (self.sp > self.maxSP) {
                            throw 'Stack underflow';
                        }
                    } else {
                        throw 'Invalid register: ' + reg;
                    }
                };

                var getGPR_SP = function(reg, size)
                {
                    if(reg >= 0 && reg < self.gpr.length) {
                        if (size > 1)
                            return self.gpr[reg];
                        else
                            return self.gpr[reg] & 0xff;
                    } else if(reg == self.gpr.length) {
                        if (size > 1)
                            return self.sp;
                        else
                            return self.sp & 0xff;
                    } else {
                        throw 'Invalid register: ' + reg;
                    }
                };

                var indirectRegisterAddress = function(value) {
                    var reg = value % 8;
                    
                    var base;
                    if (reg < self.gpr.length) {
                        base = self.gpr[reg];
                    } else {
                        base = self.sp;
                    }
                    
                    var offset = Math.floor(value / 8);
                    if ( offset > 4095 ) {
                        offset = offset - 8191;
                    }
                    
                    return base+offset;
                };

                var checkOperation = function(value) {
                    self.zero = false;
                    self.carry = false;

                    if (value >= 65536) {
                        self.carry = true;
                        value = value % 65536;
                    } else if (value === 0) {
                        self.zero = true;
                    } else if (value < 0) {
                        self.carry = true;
                        value = 65536 - (-value) % 65536;
                    }

                    return value;
                };

                var jump = function(newIP) {
                    if (newIP < 0 || newIP >= memory.data.length) {
                        throw 'IP outside memory';
                    } else {
                        self.ip = newIP;
                    }
                };

                var push = function(value) {
                    writeMemory(self.sp, 2, value);
                    self.sp -= 2;
                    if (self.sp < self.minSP) {
                        throw 'Stack overflow';
                    }
                };

                var pop = function() {
                    var value = readMemory(self.sp + 2, 2);
                    self.sp += 2;
                    if (self.sp > self.maxSP) {
                        throw 'Stack underflow';
                    }

                    return value;
                };

                var division = function(divisor) {
                    if (divisor === 0) {
                        throw 'Division by 0';
                    }

                    return Math.floor(self.gpr[0] / divisor);
                };
                
                var readMemory = function(address, size) {
                    var data = memory.load(address);
                    
                    if (size > 1)
                        data = (data << 8) | memory.load(address + 1);
                    
                    return data;
                };
                
                var writeMemory = function(address, size, data) {
                    if (size > 1) {
                        memory.store(address, data >> 8);
                        memory.store(address + 1, data & 0xff);
                    } else {
                        memory.store(address, data & 0xff);
                    }
                };

                if (self.ip < 0 || self.ip >= memory.data.length) {
                    throw 'Instruction pointer is outside of memory';
                }
                
                var regTo, regFrom, memFrom, memTo, number;
                var instr = memory.load(self.ip);
                switch(instr) {
                    case opcodes.NONE:
                        return false; // Abort step
                    case opcodes.MOV_REG_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = checkGPR_SP(readMemory(self.ip + 3, 2));
                        setGPR_SP(regTo,getGPR_SP(regFrom,2),2);
                        self.ip += 5;
                        break;
                    case opcodes.MOV_ADDRESS_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        memFrom = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,readMemory(memFrom, 2),2);
                        self.ip += 5;
                        break;
                    case opcodes.MOV_REGADDRESS_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,readMemory(indirectRegisterAddress(regFrom), 2),2);
                        self.ip += 5;
                        break;
                    case opcodes.MOV_REG_TO_ADDRESS:
                        memTo = readMemory(self.ip + 1, 2);
                        regFrom = checkGPR_SP(readMemory(self.ip + 3, 2));
                        writeMemory(memTo, 2, getGPR_SP(regFrom,2));
                        self.ip += 5;
                        break;
                    case opcodes.MOV_REG_TO_REGADDRESS:
                        regTo = readMemory(self.ip + 1, 2);
                        regFrom = checkGPR_SP(readMemory(self.ip + 3, 2));
                        writeMemory(indirectRegisterAddress(regTo), 2, getGPR_SP(regFrom,2));
                        self.ip += 5;
                        break;
                    case opcodes.MOV_NUMBER_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        number = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,number,2);
                        self.ip += 5;
                        break;
                    case opcodes.MOV_NUMBER_TO_ADDRESS:
                        memTo = readMemory(self.ip + 1, 2);
                        number = readMemory(self.ip + 3, 2);
                        writeMemory(memTo, 2, number);
                        self.ip += 5;
                        break;
                    case opcodes.MOV_NUMBER_TO_REGADDRESS:
                        regTo = readMemory(self.ip + 1, 2);
                        number = readMemory(self.ip + 3, 2);
                        writeMemory(indirectRegisterAddress(regTo), 2, number);
                        self.ip += 5;
                        break;
                    case opcodes.MOV_BYTE_REG_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = checkGPR_SP(readMemory(self.ip + 3, 2));
                        setGPR_SP(regTo,getGPR_SP(regFrom,1),1);
                        self.ip += 5;
                        break;
                    case opcodes.MOV_BYTE_ADDRESS_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        memFrom = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,readMemory(memFrom, 1),1);
                        self.ip += 5;
                        break;
                    case opcodes.MOV_BYTE_REGADDRESS_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,readMemory(indirectRegisterAddress(regFrom), 1),1);
                        self.ip += 5;
                        break;
                    case opcodes.MOV_BYTE_REG_TO_ADDRESS:
                        memTo = readMemory(self.ip + 1, 2);
                        regFrom = checkGPR_SP(readMemory(self.ip + 3, 2));
                        writeMemory(memTo, 1, getGPR_SP(regFrom,1));
                        self.ip += 5;
                        break;
                    case opcodes.MOV_BYTE_REG_TO_REGADDRESS:
                        regTo = readMemory(self.ip + 1, 2);
                        regFrom = checkGPR_SP(readMemory(self.ip + 3, 2));
                        writeMemory(indirectRegisterAddress(regTo), 1, getGPR_SP(regFrom,1));
                        self.ip += 5;
                        break;
                    case opcodes.MOV_BYTE_NUMBER_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        number = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,number,1);
                        self.ip += 5;
                        break;
                    case opcodes.MOV_BYTE_NUMBER_TO_ADDRESS:
                        memTo = readMemory(self.ip + 1, 2);
                        number = readMemory(self.ip + 3, 2);
                        writeMemory(memTo, 1, number);
                        self.ip += 5;
                        break;
                    case opcodes.MOV_BYTE_NUMBER_TO_REGADDRESS:
                        regTo = readMemory(self.ip + 1, 2);
                        number = readMemory(self.ip + 3, 2);
                        writeMemory(indirectRegisterAddress(regTo), 1, number);
                        self.ip += 5;
                        break;
                    case opcodes.ADD_REG_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = checkGPR_SP(readMemory(self.ip + 3, 2));
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,2) + getGPR_SP(regFrom,2)),2);
                        self.ip += 5;
                        break;
                    case opcodes.ADD_REGADDRESS_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,2) + readMemory(indirectRegisterAddress(regFrom), 2)),2);
                        self.ip += 5;
                        break;
                    case opcodes.ADD_ADDRESS_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        memFrom = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,2) + readMemory(memFrom, 2)),2);
                        self.ip += 5;
                        break;
                    case opcodes.ADD_NUMBER_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        number = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,2) + number),2);
                        self.ip += 5;
                        break;
                    case opcodes.ADD_BYTE_REG_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = checkGPR_SP(readMemory(self.ip + 3, 2));
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,1) + getGPR_SP(regFrom,1)),1);
                        self.ip += 5;
                        break;
                    case opcodes.ADD_BYTE_REGADDRESS_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,1) + readMemory(indirectRegisterAddress(regFrom),1)),1);
                        self.ip += 5;
                        break;
                    case opcodes.ADD_BYTE_ADDRESS_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        memFrom = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,1) + readMemory(memFrom, 1)),1);
                        self.ip += 5;
                        break;
                    case opcodes.ADD_BYTE_NUMBER_TO_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        number = readMemory(self.ip + 4, 1);
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,1) + number),1);
                        self.ip += 5;
                        break;
                    case opcodes.SUB_REG_FROM_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = checkGPR_SP(readMemory(self.ip + 3, 2));
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,2) - getGPR_SP(regFrom, 2)),2);
                        self.ip += 5;
                        break;
                    case opcodes.SUB_REGADDRESS_FROM_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,2) - readMemory(indirectRegisterAddress(regFrom), 2)),2);
                        self.ip += 5;
                        break;
                    case opcodes.SUB_ADDRESS_FROM_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        memFrom = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,2) - readMemory(memFrom, 2)),2);
                        self.ip += 5;
                        break;
                    case opcodes.SUB_NUMBER_FROM_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        number = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,2) - number),2);
                        self.ip += 5;
                        break;
                    case opcodes.SUB_BYTE_REG_FROM_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = checkGPR_SP(readMemory(self.ip + 3, 2));
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,1) - getGPR_SP(regFrom, 1)),1);
                        self.ip += 5;
                        break;
                    case opcodes.SUB_BYTE_REGADDRESS_FROM_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,1) - readMemory(indirectRegisterAddress(regFrom), 1)),1);
                        self.ip += 5;
                        break;
                    case opcodes.SUB_BYTE_ADDRESS_FROM_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        memFrom = readMemory(self.ip + 3, 2);
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,1) - readMemory(memFrom, 1)),1);
                        self.ip += 5;
                        break;
                    case opcodes.SUB_BYTE_NUMBER_FROM_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        number = readMemory(self.ip + 4, 1);
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,1) - number),1);
                        self.ip += 5;
                        break;
                    case opcodes.INC_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,2) + 1),2);
                        self.ip += 3;
                        break;
                    case opcodes.DEC_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        setGPR_SP(regTo,checkOperation(getGPR_SP(regTo,2) - 1),2);
                        self.ip += 3;
                        break;
                    case opcodes.CMP_REG_WITH_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = checkGPR_SP(readMemory(self.ip + 3, 2));
                        checkOperation(getGPR_SP(regTo,2) - getGPR_SP(regFrom,2));
                        self.ip += 5;
                        break;
                    case opcodes.CMP_REGADDRESS_WITH_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = readMemory(self.ip + 3, 2);
                        checkOperation(getGPR_SP(regTo,2) - readMemory(indirectRegisterAddress(regFrom), 2));
                        self.ip += 5;
                        break;
                    case opcodes.CMP_ADDRESS_WITH_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        memFrom = readMemory(self.ip + 3, 2);
                        checkOperation(getGPR_SP(regTo,2) - readMemory(memFrom, 2));
                        self.ip += 5;
                        break;
                    case opcodes.CMP_NUMBER_WITH_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        number = readMemory(self.ip + 3, 2);
                        checkOperation(getGPR_SP(regTo,2) - number);
                        self.ip += 5;
                        break;
                    case opcodes.CMP_BYTE_REG_WITH_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = checkGPR_SP(readMemory(self.ip + 3, 2));
                        checkOperation((getGPR_SP(regTo,2) & 0xff) - (getGPR_SP(regFrom,2) & 0xff));
                        self.ip += 5;
                        break;
                    case opcodes.CMP_BYTE_REGADDRESS_WITH_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        regFrom = readMemory(self.ip + 3, 2);
                        checkOperation((getGPR_SP(regTo,2) & 0xff) - readMemory(indirectRegisterAddress(regFrom), 1));
                        self.ip += 5;
                        break;
                    case opcodes.CMP_BYTE_ADDRESS_WITH_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        memFrom = readMemory(self.ip + 3, 2);
                        checkOperation((getGPR_SP(regTo,2) & 0xff )- readMemory(memFrom, 1));
                        self.ip += 5;
                        break;
                    case opcodes.CMP_BYTE_NUMBER_WITH_REG:
                        regTo = checkGPR_SP(readMemory(self.ip + 1, 2));
                        number = readMemory(self.ip + 3, 2);
                        checkOperation((getGPR_SP(regTo,2) & 0xff) - (number & 0xff));
                        self.ip += 5;
                        break;
                    case opcodes.JMP_REGADDRESS:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        jump(self.gpr[regTo]);
                        break;
                    case opcodes.JMP_ADDRESS:
                        number = readMemory(self.ip + 1, 2);
                        jump(number);
                        break;
                    case opcodes.JC_REGADDRESS:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        if (self.carry) {
                            jump(self.gpr[regTo]);
                        } else {
                            self.ip += 3;
                        }
                        break;
                    case opcodes.JC_ADDRESS:
                        number = readMemory(self.ip + 1, 2);
                        if (self.carry) {
                            jump(number);
                        } else {
                            self.ip += 3;
                        }
                        break;
                    case opcodes.JNC_REGADDRESS:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        if (!self.carry) {
                            jump(self.gpr[regTo]);
                        } else {
                            self.ip += 3;
                        }
                        break;
                    case opcodes.JNC_ADDRESS:
                        number = readMemory(self.ip + 1, 2);
                        if (!self.carry) {
                            jump(number);
                        } else {
                            self.ip += 3;
                        }
                        break;
                    case opcodes.JZ_REGADDRESS:
                        regTo = checkGPR(readMemory.load(self.ip + 1, 2));
                        if (self.zero) {
                            jump(self.gpr[regTo]);
                        } else {
                            self.ip += 3;
                        }
                        break;
                    case opcodes.JZ_ADDRESS:
                        number = readMemory(self.ip + 1, 2);
                        if (self.zero) {
                            jump(number);
                        } else {
                            self.ip += 3;
                        }
                        break;
                    case opcodes.JNZ_REGADDRESS:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        if (!self.zero) {
                            jump(self.gpr[regTo]);
                        } else {
                            self.ip += 3;
                        }
                        break;
                    case opcodes.JNZ_ADDRESS:
                        number = readMemory(self.ip + 1, 2);
                        if (!self.zero) {
                            jump(number);
                        } else {
                            self.ip += 3;
                        }
                        break;
                    case opcodes.JA_REGADDRESS:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        if (!self.zero && !self.carry) {
                            jump(self.gpr[regTo]);
                        } else {
                            self.ip += 3;
                        }
                        break;
                    case opcodes.JA_ADDRESS:
                        number = readMemory(self.ip + 1, 2);
                        if (!self.zero && !self.carry) {
                            jump(number);
                        } else {
                            self.ip += 3;
                        }
                        break;
                    case opcodes.JNA_REGADDRESS: // JNA REG
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        if (self.zero || self.carry) {
                            jump(self.gpr[regTo]);
                        } else {
                            self.ip += 3;
                        }
                        break;
                    case opcodes.JNA_ADDRESS:
                        number = readMemory(self.ip + 1, 2);
                        if (self.zero || self.carry) {
                            jump(number);
                        } else {
                            self.ip += 3;
                        }
                        break;
                    case opcodes.PUSH_REG:
                        regFrom = checkGPR(readMemory(self.ip + 1, 2));
                        push(self.gpr[regFrom]);
                        self.ip += 3;
                        break;
                    case opcodes.PUSH_REGADDRESS:
                        regFrom = readMemory(self.ip + 1, 2);
                        push(memory.load(indirectRegisterAddress(regFrom)));
                        self.ip += 3;
                        break;
                    case opcodes.PUSH_ADDRESS:
                        memFrom = readMemory(self.ip + 1, 2);
                        push(readMemory(memFrom, 2));
                        self.ip += 3;
                        break;
                    case opcodes.PUSH_NUMBER:
                        number = readMemory(self.ip + 1, 2);
                        push(number);
                        self.ip += 3;
                        break;
                    case opcodes.POP_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        self.gpr[regTo] = pop();
                        self.ip += 3;
                        break;
                    case opcodes.CALL_REGADDRESS:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        push(self.ip + 3);
                        jump(self.gpr[regTo]);
                        break;
                    case opcodes.CALL_ADDRESS:
                        number = readMemory(self.ip + 1, 2);
                        push(self.ip + 3);
                        jump(number);
                        break;
                    case opcodes.RET:
                        jump(pop());
                        break;
                    case opcodes.MUL_REG: // A = A * REG
                        regFrom = checkGPR(readMemory(self.ip + 1, 2));
                        self.gpr[0] = checkOperation(self.gpr[0] * self.gpr[regFrom]);
                        self.ip += 3;
                        break;
                    case opcodes.MUL_REGADDRESS: // A = A * [REG]
                        regFrom = readMemory(self.ip + 1, 2);
                        self.gpr[0] = checkOperation(self.gpr[0] * readMemory(indirectRegisterAddress(regFrom), 2));
                        self.ip += 3;
                        break;
                    case opcodes.MUL_ADDRESS: // A = A * [NUMBER]
                        memFrom = readMemory(self.ip + 1, 2);
                        self.gpr[0] = checkOperation(self.gpr[0] * readMemory(memFrom, 2));
                        self.ip += 3;
                        break;
                    case opcodes.MUL_NUMBER: // A = A * NUMBER
                        number = readMemory(self.ip + 1, 2);
                        self.gpr[0] = checkOperation(self.gpr[0] * number);
                        self.ip += 3;
                        break;
                    case opcodes.DIV_REG: // A = A / REG
                        regFrom = checkGPR(readMemory(self.ip + 1, 2));
                        self.gpr[0] = checkOperation(division(self.gpr[regFrom]));
                        self.ip += 3;
                        break;
                    case opcodes.DIV_REGADDRESS: // A = A / [REG]
                        regFrom = readMemory(self.ip + 1, 2);
                        self.gpr[0] = checkOperation(division(readMemory(indirectRegisterAddress(regFrom), 2)));
                        self.ip += 3;
                        break;
                    case opcodes.DIV_ADDRESS: // A = A / [NUMBER]
                        memFrom = readMemory(self.ip + 1, 2);
                        self.gpr[0] = checkOperation(division(readMemory(memFrom, 2)));
                        self.ip += 3;
                        break;
                    case opcodes.DIV_NUMBER: // A = A / NUMBER
                        number = readMemory(self.ip + 1, 2);
                        self.gpr[0] = checkOperation(division(number));
                        self.ip += 3;
                        break;
                    case opcodes.AND_REG_WITH_REG:
                        regTo = checkGPR(memory.load(++self.ip));
                        regFrom = checkGPR(memory.load(++self.ip));
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] & self.gpr[regFrom]);
                        self.ip++;
                        break;
                    case opcodes.AND_REGADDRESS_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        regFrom = readMemory(self.ip + 3, 2);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] & readMemory(indirectRegisterAddress(regFrom), 2));
                        self.ip += 5;
                        break;
                    case opcodes.AND_ADDRESS_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        memFrom = readMemory(self.ip + 3, 2);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] & readMemory(memFrom, 2));
                        self.ip += 5;
                        break;
                    case opcodes.AND_NUMBER_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        number = readMemory(self.ip + 3, 2);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] & number);
                        self.ip += 5;
                        break;
                    case opcodes.OR_REG_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        regFrom = checkGPR(readMemory(self.ip + 3, 2));
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] | self.gpr[regFrom]);
                        self.ip += 5;
                        break;
                    case opcodes.OR_REGADDRESS_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        regFrom = readMemory(self.ip + 3, 2);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] | readMemory(indirectRegisterAddress(regFrom), 2));
                        self.ip += 5;
                        break;
                    case opcodes.OR_ADDRESS_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        memFrom = readMemory(self.ip + 3, 2);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] | readMemory(memFrom, 2));
                        self.ip += 5;
                        break;
                    case opcodes.OR_NUMBER_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        number = readMemory(self.ip + 3, 2);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] | number);
                        self.ip += 5;
                        break;
                    case opcodes.XOR_REG_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        regFrom = checkGPR(readMemory(self.ip + 3, 2));
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] ^ self.gpr[regFrom]);
                        self.ip += 5;
                        break;
                    case opcodes.XOR_REGADDRESS_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        regFrom = readMemory(self.ip + 3, 2);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] ^ readMemory(indirectRegisterAddress(regFrom), 2));
                        self.ip += 5;
                        break;
                    case opcodes.XOR_ADDRESS_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        memFrom = readMemory(self.ip + 3, 2);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] ^ readMemory(memFrom, 2));
                        self.ip += 5;
                        break;
                    case opcodes.XOR_NUMBER_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        number = readMemory(self.ip + 3, 2);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] ^ number);
                        self.ip += 5;
                        break;
                    case opcodes.NOT_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        self.gpr[regTo] = checkOperation(~self.gpr[regTo]);
                        self.ip += 3;
                        break;
                    case opcodes.SHL_REG_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        regFrom = checkGPR(readMemory(self.ip + 3, 2));
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] << self.gpr[regFrom]);
                        self.ip += 5;
                        break;
                    case opcodes.SHL_REGADDRESS_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        regFrom = readMemory(self.ip + 3, 2);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] << readMemory(indirectRegisterAddress(regFrom), 2));
                        self.ip += 5;
                        break;
                    case opcodes.SHL_ADDRESS_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        memFrom = readMemory(self.ip + 3, 2);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] << readMemory(memFrom, 2));
                        self.ip += 5;
                        break;
                    case opcodes.SHL_NUMBER_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        number = readMemory(self.ip + 3, 2);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] << number);
                        self.ip += 5;
                        break;
                    case opcodes.SHR_REG_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        regFrom = checkGPR(readMemory(self.ip + 3, 2));
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] >>> self.gpr[regFrom]);
                        self.ip += 5;
                        break;
                    case opcodes.SHR_REGADDRESS_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        regFrom = readMemory(self.ip + 3, 2);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] >>> readMemory(indirectRegisterAddress(regFrom), 2));
                        self.ip += 5;
                        break;
                    case opcodes.SHR_ADDRESS_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        memFrom = readMemory(self.ip + 3, 2);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] >>> readMemory(memFrom, 2));
                        self.ip += 5;
                        break;
                    case opcodes.SHR_NUMBER_WITH_REG:
                        regTo = checkGPR(readMemory(self.ip + 1, 2));
                        number = readMemory(self.ip + 3, 2);
                        self.gpr[regTo] = checkOperation(self.gpr[regTo] >>> number);
                        self.ip += 5;
                        break;
                    default:
                        throw 'Invalid op code: ' + instr;
                }

                return true;
            } catch(e) {
                self.fault = true;
                throw e;
            }
        },
        reset: function() {
            var self = this;
            self.maxSP = 0x3DF;
            self.minSP = 0;

            self.gpr = [0, 0, 0, 0];
            self.sp = self.maxSP - 1;
            self.ip = 0;
            self.zero = false;
            self.carry = false;
            self.fault = false;
        }
    };

    cpu.reset();
    return cpu;
}]);
