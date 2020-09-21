const chai = require('chai')
const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const {
  modulesWithKeyword,
  checkForNewServerVersion,
  getLatestServerVersion
} = require('./modules')

const expectedModules = [
  '@signalk/freeboard-sk',
  '@signalk/instrumentpanel',
  '@signalk/maptracker',
  '@signalk/sailgauge',
  '@signalk/simplegauges'
]

const testTempDir = path.join(
  require('os').tmpdir(),
  '_skservertest_modules' + Date.now()
)

const app = {
  config: {
    appPath: path.join(__dirname + '/../'),
    configPath: testTempDir
  }
}

fs.mkdirSync(testTempDir)
const tempNodeModules = path.join(testTempDir, 'node_modules/')
fs.mkdirSync(path.join(testTempDir, 'node_modules'))
fs.mkdirSync(path.join(testTempDir, 'node_modules/@signalk'))
const configMaptrackerDirectory = path.join(
  testTempDir,
  'node_modules/@signalk/maptracker'
)
fs.mkdirSync(configMaptrackerDirectory)

const maptrackerPkg = require(path.join(
  app.config.appPath,
  'node_modules/@signalk/maptracker/package.json'
))
maptrackerPkg.version = '1000.0.0'
fs.writeFileSync(
  path.join(configMaptrackerDirectory, 'package.json'),
  JSON.stringify(maptrackerPkg)
)

describe('modulesWithKeyword', () => {
  it('returns a list of modules', () => {
    const moduleList = modulesWithKeyword(app, 'signalk-webapp')
    chai.expect(_.map(moduleList, 'module')).to.eql(expectedModules)
    chai.expect(moduleList[0].location).to.not.eql(tempNodeModules)
    chai.expect(moduleList[2].location).to.eql(tempNodeModules)
  })
})

describe('checkForNewServerVersion', () => {
  const newMinorVersionInfo = { version: '1.18.0', disttag: 'latest', minimumNodeVersio: '10'}
  it('normal version upgrade', done => {
    checkForNewServerVersion(
      '1.17.0',
      (err, newVersion) => {
        if (err) {
          done(err)
        } else {
          chai.expect(newVersion).to.equal(newMinorVersionInfo.version)
          done()
        }
      },
      () => Promise.resolve(newMinorVersionInfo)
    )
  })

  it('normal version does not upgrade to beta', done => {
    const newBetaVersion = { version: '1.18.0-beta.2', disttag: 'latest', minimumNodeVersio: '10'}
    checkForNewServerVersion(
      '1.17.0',
      err => {
        done('callback should not be called')
      },
      () => Promise.resolve(newBetaVersion)
    )
    done()
  })

  it('beta upgrades to same minor newer beta', done => {
    const newerBetaVersionInfo = { version: '1.18.0-beta.2', disttag: 'latest', minimumNodeVersio: '10'}
    checkForNewServerVersion(
      '1.18.0-beta.1',
      (err, newVersion) => {
        if (err) {
          done(err)
        } else {
          chai.expect(newVersion).to.equal(newerBetaVersionInfo.version)
          done()
        }
      },
      () => Promise.resolve(newerBetaVersionInfo)
    )
  })

  it('beta upgrades to same normal version', done => {
    const sameNormalVersion = { version: '1.18.0', disttag: 'latest', minimumNodeVersio: '10'}
    checkForNewServerVersion(
      '1.18.0-beta.2',
      (err, newVersion) => {
        if (err) {
          done(err)
        } else {
          chai.expect(newVersion).to.equal(sameNormalVersion.version)
          done()
        }
      },
      () => Promise.resolve(sameNormalVersion)
    )
  })

  it('beta upgrades to newer normal version', done => {
    const newerNormalVersion = { version: '1.19.0', disttag: 'latest', minimumNodeVersio: '10'}
    checkForNewServerVersion(
      '1.18.0-beta.2',
      (err, newVersion) => {
        if (err) {
          done(err)
        } else {
          chai.expect(newVersion).to.equal(newerNormalVersion.version)
          done()
        }
      },
      () => Promise.resolve(newerNormalVersion)
    )
  })

  it('beta does not upgrade to newer minor beta', done => {
    const nextMinorBetaVersion = { version: '1.18.0-beta.2', disttag: 'latest', minimumNodeVersio: '10'}
    checkForNewServerVersion(
      '1.17.0-beta.1',
      err => {
        done('callback should not be called')
      },
      () => Promise.resolve(nextMinorBetaVersion)
    )
    done()
  })
})

describe('getLatestServerVersion', () => {
  it('latest for normal is normal', () => {
    return getLatestServerVersion('1.17.0', () =>
      Promise.resolve({
        json: () => ({
          latest: '1.18.3',
          beta: '1.19.0-beta.1'
        })
      })
    ).then(newVersion => {
      chai.expect(newVersion).to.equal('1.18.3')
    })
  })

  it('latest for beta is newer same series beta', done => {
    getLatestServerVersion('1.18.0-beta.2', () =>
      Promise.resolve({
        json: () => ({
          latest: '1.17.3',
          beta: '1.18.0-beta.3'
        })
      })
    ).then(newVersion => {
      chai.expect(newVersion).to.equal('1.18.0-beta.3')
      done()
    })
  })

  it('latest for beta is newer real release', () => {
    return getLatestServerVersion('1.18.0-beta.2', () =>
      Promise.resolve({
        json: () => ({
          latest: '1.18.0',
          beta: '1.18.0-beta.3'
        })
      })
    ).then(newVersion => {
      chai.expect(newVersion).to.equal('1.18.0')
    })
  })
})
