module.exports = function(grunt) {

  grunt.initConfig({
      pkg: grunt.file.readJSON('package.json'),
      copy: {
        dist: {
          expand: true,
          flatten: true,
          src: [
            'node_modules/angular/angular.min.js',
            'node_modules/bootstrap/dist/js/bootstrap.min.js',
            'node_modules/jquery/dist/jquery.min.js',
            'node_modules/bootstrap/dist/css/bootstrap.min.css'
          ],
          dest: 'app/'
        }
      },
      jshint: {
        files: ['Gruntfile.js', 'src/**/*.js']
      },
      uglify: {
        dist: {
          files: {
            'app/asmsimulator.js': ['src/app.js', 'src/**/*.js']
          }
        }
      },
      watch: {
        files: ['<%= jshint.files %>'],
        tasks: ['jshint', 'uglify']
      }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['jshint', 'copy', 'uglify']);

};

