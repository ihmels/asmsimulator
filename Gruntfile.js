module.exports = function(grunt) {

  grunt.initConfig({
      pkg: grunt.file.readJSON('package.json'),
      copy: {
        app: {
          expand: true,
          cwd: 'app/',
          src: '**/*.{css,html}',
          dest: 'public/'
        },
        deps: {
          expand: true,
          flatten: true,
          src: [
            'node_modules/angular/angular.min.js',
            'node_modules/bootstrap/dist/js/bootstrap.min.js',
            'node_modules/jquery/dist/jquery.min.js',
            'node_modules/bootstrap/dist/css/bootstrap.min.css'
          ],
          dest: 'public/'
        }
      },
      jshint: {
        app: ['Gruntfile.js', 'app/**/*.js']
      },
      uglify: {
        app: {
          files: {
            'public/app.min.js': 'app/**/*.js'
          }
        }
      },
      watch: {
        files: ['<%= jshint.files %>'],
        tasks: ['jshint', 'uglify']
      },
      compress: {
        dist: {
          options: {
            archive: 'dist/asmsimulator-<%= pkg.version %>.zip',
          },
          expand: true,
          cwd: 'public/',
          src: ['**'],
          dest: 'asmsimulator/'
        }
      },
  });

  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['copy', 'jshint', 'uglify']);
  grunt.registerTask('release', ['default', 'compress']);

};
