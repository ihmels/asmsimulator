app.controller('Controller', ['$document', '$scope', '$timeout', 'cpu', 'memory', 'assembler', function($document, $scope, $timeout, cpu, memory, assembler) {
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
    $scope.outputStartIndex = 0x1E0;
    $scope.outputEndIndex = 0x1E0 + 32;

    $scope.userCode = '; Simple example\n' +
        '; Writes Hello World to the output\n' +
        '\n' +
        '\tJMP start\n' +
        'hello:\tDB "Hello World!"\t; Variable\n' +
        '\tDB 0\t\t\t; String terminator\n' +
        '\n' +
        'start:\n' +
        '\tMOV A, hello\t\t; Point to string\n' +
        '\tMOV B, 10\t\t; Set offset on output\n' +
        '\tINT 2\t\t\t; Call interrupt 2\n' +
        '\tHLT\t\t\t; Stop execution';

    $scope.kernelCode = '; Kernel code\n' +
        '; Provides interrupt service routines for output\n' +
        '\n' +
        '; Initialize\n' +
        '\tMOV [0], output_clear\t; Add ISRs to interrupt vector table\n' +
        '\tMOV [2], output_char\n' +
        '\tMOV [4], output_string\n' +
        '\tMOV A, 0x200\t\t; Set address of userspace\n' +
        '\tPUSH A\n' +
        '\tMOV A, 0\n' +
        '\tIRET\t\t\t; Jump to userspace\n' +
        '\n' +
        'output_clear:\n' +
        '\tPUSH A\n' +
        '\tMOV A, 0x1e0\t\t; Address of output\n' +
        '.loop1:\tMOV BYTE [A], 0\t\t; Clear display at address\n' +
        '\tINC A\t\t\t; Increment address\n' +
        '\tCMP A, 0x200\t\t; Check if end of output\n' +
        '\tJB .loop1\t\t; Jump if not\n' +
        '\tPOP A\n' +
        '\tIRET\n' +
        '\n' +
        'output_char:\n' +
        '\tPUSH C\n' +
        '\tMOV C, 0x1e0\t\t; Address of output\n' +
        '\tADD C, B\t\t; Add offset to address of output\n' +
        '\tMOV BYTE [C], A\t\t; Print character\n' +
        '\tPOP C\n' +
        '\tIRET\n' +
        '\n' +
        'output_string:\n' +
        '\tPUSH A\n' +
        '\tPUSH B\n' +
        '\tPUSH C\n' +
        '\tPUSH D\n' +
        '\n' +
        '\tMOV C, A\t\t; Address of string\n' +
        '\tMOV D, 0x1e0\t\t; Address of output\n' +
        '\tADD D, B\t\t; Add offset to address of output\n' +
        '\n' +
        '\tMOV BYTE A, 0\t\t; String terminator\n' +
        '\n' +
        '.loop2:\tMOV BYTE B, [C]\t\t; Get character\n' +
        '\tMOV BYTE [D], B\t\t; Write character\n' +
        '\tINC C\t\t\t; Next character address\n' +
        '\tINC D\t\t\t; Next output address\n' +
        '\n' +
        '\tCMP D, 0x200\t\t; Check if end of output\n' +
        '\tJAE .end\t\t; Jump if not\n' +
        '\n' +
        '\tCMP BYTE A, [C]\t\t; Check if end of string\n' +
        '\tJNZ .loop2\t\t; jump if not\n' +
        '\n' +
        '.end:\tPOP D\n' +
        '\tPOP C\n' +
        '\tPOP B\n' +
        '\tPOP A\n' +
        '\tIRET';

    $scope.reset = function() {
        cpu.reset();
        memory.reset();
        $scope.error = '';
        $scope.selectedLine = -1;
    };

    $scope.executeStep = function() {
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
    $scope.run = function() {
        if (!$scope.checkPrgrmLoaded()) {
            $scope.assemble();
        }

        $scope.isRunning = true;
        runner = $timeout(function() {
            if ($scope.executeStep() === true) {
                $scope.run();
            } else {
                $scope.isRunning = false;
            }
        }, 1000 / $scope.speed);
    };

    $scope.stop = function() {
        $timeout.cancel(runner);
        $scope.isRunning = false;
    };

    $scope.checkPrgrmLoaded = function() {
        for (var i = 0, l = memory.data.length; i < l; i++) {
            if (memory.data[i] !== 0) {
                return true;
            }
        }

        return false;
    };

    $scope.isAsciiChar = function(value) {
        if (value >= 32 && value <= 126) {
            return true;
        }

        return false;
    };

    $scope.getChar = function(value) {
        if (value != 0 && !$scope.isAsciiChar(value)) {
            return '\uFFFD';
        }

        var text = String.fromCharCode(value);

        if (text.trim() === '') {
            return '\u00A0';
        } else {
            return text;
        }
    };

    $scope.assemble = function() {
        try {
            $scope.reset();

            var userAssembly = assembler.go($scope.userCode, 512);
            var userBinary = userAssembly.code;
            $scope.mapping = userAssembly.mapping;
            $scope.labels = userAssembly.labels;

            var kernelAssembly = assembler.go($scope.kernelCode, 16);
            var kernelBinary = kernelAssembly.code;

            // Copy user binary to memory
            if (userBinary.length > memory.data.length - 512)
                throw 'User binary code does not fit into the memory. Max ' + (memory.data.length - 512) + ' bytes are allowed';

            for (var i = 0, l = userBinary.length; i < l; i++) {
                memory.data[i + 512] = userBinary[i];
            }

            // Copy kernel binary to memory
            if (kernelBinary.length > memory.data.length - 512)
                throw 'Kernel binary code does not fit into the memory. Max ' + (memory.data.length - 512 - 16) + ' bytes are allowed';

            for (var j = 0, m = kernelBinary.length; j < m; j++) {
                memory.data[j + 16] = kernelBinary[j];
            }
        } catch (e) {
            if (e.line !== undefined) {
                $scope.error = 'Line ' + (e.line + 1) + ' | ' + e.error;
                $scope.selectedLine = e.line;
            } else {
                $scope.error = e.error;
            }
        }
    };

    $scope.jumpToLine = function(index) {
        $document[0].getElementById('userCode').scrollIntoView();
        $scope.selectedLine = $scope.mapping[index];
    };


    $scope.isInstruction = function(index) {
        return $scope.mapping !== undefined &&
            $scope.mapping[index] !== undefined &&
            $scope.displayInstr;
    };

    $scope.getMemoryCellCss = function(index) {
        if (index >= $scope.outputStartIndex && index < $scope.outputEndIndex) {
            return 'output-bg';
        } else if ($scope.isInstruction(index)) {
            return 'instr-bg';
        } else if (index > cpu.sp && index <= cpu.maxSP) {
            return 'stack-bg';
        } else {
            return '';
        }
    };

    $scope.getMemoryInnerCellCss = function(index) {
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
