module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: ';'
            },
            dist: {
                src: ['src/app.js', 'src/**/*.js'],
                dest: 'app/<%= pkg.name %>.js'
            }
        },
        jshint: {
            files: ['Gruntfile.js', 'src/**/*.js']
        },
        uglify: {
          options: {
            mangle: false
          },
          dist: {
            files: {
              'app/asmsimulator.js': ['app/asmsimulator.js']
            }
          }
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['jshint', 'concat']
        },
        connect: {
          server: {
            options: {
              port: 8080,
              base: 'app',
              keepalive: true
            }
          }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');

    grunt.registerTask('default', ['jshint', 'concat', 'uglify']);

};
