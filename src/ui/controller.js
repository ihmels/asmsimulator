app.controller('Ctrl', ['$document', '$scope', '$timeout', 'cpu', 'memory', 'assembler', function ($document, $scope, $timeout, cpu, memory, assembler) {
    $scope.memory = memory;
    $scope.cpu = cpu;
    $scope.error = '';
    $scope.isRunning = false;
    $scope.displayHex = true;
    $scope.displayInstr = true;
    $scope.displayA = false;
    $scope.displayB = false;
    $scope.displayC = false;
    $scope.displayD = false;
    $scope.speeds = [{speed: 0.125, desc: '⅛ Hz'},
                     {speed: 0.25, desc: '¼ Hz'},
                     {speed: 0.5, desc: '½ Hz'},
                     {speed: 1, desc: '1 Hz'},
                     {speed: 2, desc: '2 Hz'},
                     {speed: 4, desc: '4 Hz'},
                     {speed: 8, desc: '8 Hz'},
                     {speed: 16, desc: '16 Hz'}];
    $scope.speed = 4;
    $scope.outputStartIndex = 0x3E0;

    $scope.code = '; Simple example\n' +
        '; Writes Hello World to the output\n' +
        '\n' +
        '\tJMP start\n' +
        'hello:\tDB \"Hello World!\"\t; Variable\n' +
        '\tDB 0\t\t\t; String terminator\n' +
        '\n' +
        'start:\n'+
        '\tMOV C, hello\t\t; Point to var\n' +
        '\tMOV D, 0x3E0\t\t; Point to output\n' +
        '\tCALL print\n' +
        '\tHLT\t\t\t; Stop execution\n' +
        '\n' +
        'print:\t\t\t\t; print(C:*from, D:*to)\n' +
        '\tPUSH A\n' +
        '\tPUSH B\n' +
        '\tMOV B, 0\n' +
        '\n' +
        '.loop:\n' +
        '\tMOV BYTE A, [C]\t\t; Get char from var\n' +
        '\tMOV BYTE [D], A\t\t; Write to output\n' +
        '\tINC C\n' +
        '\tINC D\n' +
        '\tCMP BYTE B, [C]\t\t; Check if end\n' +
        '\tJNZ .loop\t\t; jump if not\n' +
        '\n' +
        '\tPOP B\n' +
        '\tPOP A\n' +
        '\tRET';
    var firmware = [0x00, 0x10,0x00,0x2D,0x00,0x43,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00, 0x32, 0x00, 0x00, 0x06, 0x00, 0x00, 0x03, 0xE0, 0x08, 0x00,  0x00, 0x00, 0x00, 0x12, 0x00, 0x00, 0x17, 0x00, 0x00, 0x04, 0x00, 0x27, 0x00, 0x18, 0x36, 0x00, 0x00, 0x00, 0x62, 0x32, 0x00, 0x02, 0x06, 0x00, 0x02, 0x03, 0xE0, 0x0A, 0x00, 0x02, 0x00, 0x01, 0x69, 0x00, 0x02, 0x00, 0x00, 0x36, 0x00, 0x02, 0x62, 0x32, 0x00, 0x00, 0x32, 0x00, 0x02, 0x32, 0x00, 0x03, 0x06, 0x00, 0x02, 0x03, 0xE0, 0x0A, 0x00, 0x02, 0x00, 0x01, 0x03, 0x00, 0x03, 0x00, 0x00, 0x05, 0x00, 0x02, 0x00, 0x03, 0x12, 0x00, 0x02, 0x12, 0x00, 0x00, 0x06, 0x00, 0x03, 0x00,0x00,0x79,0x00,0x03,0x00,0x00,0x27,0x00,0x56,0x36,0x00,0x03,0x36,0x00,0x02,0x36,0x00,0x00,0x62 ];

    for(var i = 0; i < firmware.length; i++){
	memory.data[i] = firmware[i];
    }

    for(i = firmware.length; i < 512; i++){
	memory.data[i] = 0;
    }

    

    $scope.reset = function () {
        cpu.reset();
        memory.reset();
        $scope.error = '';
        $scope.selectedLine = -1;
    };

    $scope.executeStep = function () {
        if (!$scope.checkPrgrmLoaded()) {
            $scope.assemble();
        }

        try {
            // Execute
            var res = cpu.step();

            // Mark in code
            if (cpu.ip in $scope.mapping) {
                $scope.selectedLine = $scope.mapping[cpu.ip];
            }

            return res;
        } catch (e) {
            $scope.error = e;
            return false;
        }
    };

    var runner;
    $scope.run = function () {
        if (!$scope.checkPrgrmLoaded()) {
            $scope.assemble();
        }

        $scope.isRunning = true;
        runner = $timeout(function () {
            if ($scope.executeStep() === true) {
                $scope.run();
            } else {
                $scope.isRunning = false;
            }
        }, 1000 / $scope.speed);
    };

    $scope.stop = function () {
        $timeout.cancel(runner);
        $scope.isRunning = false;
    };

    $scope.checkPrgrmLoaded = function () {
        for (var i = memory.startUserSpace, l = memory.data.length; i < l; i++) {
            if (memory.data[i] !== 0) {
                return true;
            }
        }

        return false;
    };

    $scope.getChar = function (value) {
        var text = String.fromCharCode(value);

        if (text.trim() === '') {
            return '\u00A0\u00A0';
        } else {
            return text;
        }
    };

    $scope.assemble = function () {
        try {
            $scope.reset();

            var assembly = assembler.go($scope.code);
            $scope.mapping = assembly.mapping;
            var binary = assembly.code;
            $scope.labels = assembly.labels;

            if ((binary.length + memory.startUserSpace) > memory.data.length)
                throw 'Binary code does not fit into the memory. Max ' + memory.data.length + ' bytes are allowed';

            for (var i = 0, l = binary.length; i < l; i++) {
                memory.data[(i + memory.startUserSpace)] = binary[i];
            }
        } catch (e) {
            if (e.line !== undefined) {
                $scope.error = e.line + ' | ' + e.error;
                $scope.selectedLine = e.line;
            } else {
                $scope.error = e.error;
            }
        }
    };

    $scope.jumpToLine = function (index) {
        $document[0].getElementById('sourceCode').scrollIntoView();
        $scope.selectedLine = $scope.mapping[index];
    };


    $scope.isInstruction = function (index) {
        return $scope.mapping !== undefined &&
            $scope.mapping[index] !== undefined &&
            $scope.displayInstr;
    };

    $scope.getMemoryCellCss = function (index) {
        if (index >= $scope.outputStartIndex) {
            return 'output-bg';
        } else if ($scope.isInstruction(index)) {
            return 'instr-bg';
        } else if (index > cpu.sp && index <= cpu.maxSP) {
            return 'stack-bg';
        } else {
            return '';
        }
    };

    $scope.getMemoryInnerCellCss = function (index) {
        if (index === cpu.ip) {
            return 'marker marker-ip';
        } else if (index === cpu.sp) {
            return 'marker marker-sp';
        } else if (index === cpu.gpr[0] && $scope.displayA) {
            return 'marker marker-a';
        } else if (index === cpu.gpr[1] && $scope.displayB) {
            return 'marker marker-b';
        } else if (index === cpu.gpr[2] && $scope.displayC) {
            return 'marker marker-c';
        } else if (index === cpu.gpr[3] && $scope.displayD) {
            return 'marker marker-d';
        } else {
            return '';
        }
    };
}]);
