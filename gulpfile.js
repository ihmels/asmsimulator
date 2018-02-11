var del = require('del');
var gulp = require('gulp');
var concat = require('gulp-concat');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var zip = require('gulp-zip');
var pkg = require('./package.json');
var Server = require('karma').Server;

var app = {
    html: [
        'app/*.html'
    ],
    css: [
        'app/*.css'
    ],
    js: [
        'app/app.js',
        'app/**/*.js'
    ]
};

var vendor = {
    css: [
        'node_modules/bootstrap/dist/css/bootstrap.min.css'
    ],
    js: [
        'node_modules/angular/angular.min.js',
        'node_modules/jquery/dist/jquery.min.js',
        'node_modules/bootstrap/dist/js/bootstrap.min.js'
    ],
    fonts: [
        'node_modules/bootstrap/dist/fonts/*'
    ]
};

var dist = {
    html: 'public/',
    css: 'public/css/',
    js: 'public/js/',
    fonts: 'public/fonts/'
};

gulp.task('clean', (done) => {
    del('public/');
    done();
});

gulp.task('vendor', (done) => {
    gulp.src(vendor.js)
        .pipe(gulp.dest(dist.js));

    gulp.src(vendor.css)
        .pipe(gulp.dest(dist.css));

    gulp.src(vendor.fonts)
        .pipe(gulp.dest(dist.fonts));

    done();
});

gulp.task('app', (done) => {
    gulp.src(app.html)
        .pipe(gulp.dest(dist.html));

    gulp.src(app.js)
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(concat('app.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest(dist.js));

    gulp.src(app.css)
        .pipe(gulp.dest(dist.css));

    done();
});

gulp.task('compress', gulp.series('app', 'vendor', (done) => {
    gulp.src('public/**/*')
        .pipe(zip('asmsimulator-' + pkg.version + '.zip'))
        .pipe(gulp.dest('dist/'));

    done();
}));

gulp.task('test', (done) => {
    new Server({
      configFile: __dirname + '/karma.conf.js',
      singleRun: true
    }, done).start();
});

gulp.task('default', gulp.series('app', 'vendor'));
