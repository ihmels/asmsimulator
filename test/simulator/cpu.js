describe('Test CPU', function() {
    var binary = [
        0x6, 0x0, 0x0, 0x0, 0x10, // MOV A, 16
        0x6, 0x0, 0x1, 0x0, 0x20, // MOV B, 32
        0xE, 0x0, 0x0, 0x0, 0x1   // SUB A, B
    ];
    
    beforeEach(function() {
        module('asmsimulator');
    });
    
    it('calculates correctly', inject(function(cpu, memory) {
        memory.data = binary;
        cpu.ip = 0;
        
        cpu.step(); // MOV A, 16
        expect(cpu.gpr).toEqual([16, 0, 0, 0]);
        
        cpu.step(); // MOV B, 32
        expect(cpu.gpr).toEqual([16, 32, 0, 0]);
        
        cpu.step(); // SUB A, B
        expect(cpu.gpr).toEqual([65520, 32, 0, 0]);
    }));
});
