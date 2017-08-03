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
          js_angularjs: {
            src: 'bower_components/angular/angular.min.js',
            dest: 'app/angular.js'
          },
          js_bootstrap: {
            src: 'bower_components/bootstrap/dist/js/bootstrap.min.js',
            dest: 'app/bootstrap.js'
          },
          js_jquery: {
            src: 'bower_components/jquery/dist/jquery.min.js',
            dest: 'app/jquery.js'
          },
          css_bootstrap: {
            src: 'bower_components/bootstrap/dist/css/bootstrap.min.css',
            dest: 'app/bootstrap.css'
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
