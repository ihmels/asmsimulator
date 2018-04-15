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

gulp.task('clean', () => {
    return del('public/');
});

gulp.task('build:vendor:js', () => {
    return gulp.src(vendor.js)
        .pipe(gulp.dest(dist.js));
});

gulp.task('build:vendor:css', () => {
    return gulp.src(vendor.css)
        .pipe(gulp.dest(dist.css));
});

gulp.task('build:vendor:fonts', () => {
    return gulp.src(vendor.fonts)
        .pipe(gulp.dest(dist.fonts));
});

gulp.task('build:vendor', gulp.parallel(
    'build:vendor:js',
    'build:vendor:css',
    'build:vendor:fonts'
));

gulp.task('build:app:html', () => {
    return gulp.src(app.html)
        .pipe(gulp.dest(dist.html));
});

gulp.task('build:app:js', () => {
    return gulp.src(app.js)
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(concat('app.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest(dist.js));
});

gulp.task('build:app:css', () => {
    return gulp.src(app.css)
        .pipe(gulp.dest(dist.css));
});

gulp.task('build:app', gulp.parallel(
    'build:app:html',
    'build:app:js',
    'build:app:css'
));

gulp.task('default', gulp.parallel('build:vendor', 'build:app'));

gulp.task('compress', gulp.series('default', () => {
    return gulp.src('public/**/*')
        .pipe(zip('asmsimulator-' + pkg.version + '.zip'))
        .pipe(gulp.dest('./dist/'));
}));

gulp.task('test', (done) => {
    new Server({
      configFile: __dirname + '/karma.conf.js',
      singleRun: true
    }, done).start();
});
