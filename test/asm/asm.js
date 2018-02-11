describe('Test assembler', function() {
    var binary = [
        0x6, 0x0, 0x0, 0x0, 0x10, // MOV A, 16
        0x6, 0x0, 0x1, 0x0, 0x20, // MOV B, 32
        0xE, 0x0, 0x0, 0x0, 0x1   // SUB A, B
    ];
    
    var plain = 
        'MOV A, 16\n' +
        'MOV B, 32\n' +
        'SUB A, B\n';
    
    beforeEach(function() {
        module('asmsimulator');
    });
    
    it('assembles code to binary', inject(function(assembler) {
        assembly = assembler.go(plain, 0);
        expect(assembly.code).toEqual(binary);
    }));
});
