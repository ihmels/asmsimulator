module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['Gruntfile.js', 'src/**/*.js']
        },
        uglify: {
          options: {
            mangle: false
          },
          dist: {
            files: {
              'app/asmsimulator.js': ['src/app.js', 'src/**/*.js']
            }
          }
        },
        copy: {
          dist: {
            src: 'bower_components/angular/angular.min.js',
            dest: 'app/angular.js'
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

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');

    grunt.registerTask('default', ['jshint', 'copy', 'uglify']);

};
