//-- copyright
// OpenProject is a project management system.
// Copyright (C) 2012-2015 the OpenProject Foundation (OPF)
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See doc/COPYRIGHT.rdoc for more details.
//++

/*jshint expr: true*/

describe('DetailsTabOverviewController', function() {
  var DEFAULT_WORK_PACKAGE_PROPERTIES = ['status', 'assignee', 'responsible',
                                         'date', 'percentageDone', 'priority',
                                         'estimatedTime', 'versionName', 'spentTime'];

  var scope, ctrl;
  var buildController;
  var HookService;
  var WorkPackagesOverviewService;
  var I18n = { t: angular.identity },
      UserService = {
        getUser: angular.identity
      },
      VersionService = {
        getVersions: angular.identity
      },
      CustomFieldHelper = {
        formatCustomFieldValue: angular.identity
      },
      workPackage = {
        props: {
          versionName: null,
          percentageDone: 0,
          estimatedTime: 'PT0S',
          spentTime: 'PT0S',
          id: '0815',
          customProperties: [
            { format: 'text', name: 'color', value: 'red' },
            { format: 'text', name: 'Width', value: '' },
            { format: 'text', name: 'height', value: '' },
          ]
        },
        embedded: {
          status: {
            props: {
              name: 'open'
            }
          },
          activities: [],
          watchers: [],
          attachments: []
        },
        links: {
        },
      };
  var $q;

  function buildWorkPackageWithId(id) {
    angular.extend(workPackage.props, {id: id});
    return workPackage;
  }

  beforeEach(module('openproject.api',
                    'openproject.services',
                    'openproject.config',
                    'openproject.workPackages.controllers'));

  beforeEach(inject(function($rootScope,
          $controller,
          $timeout,
          _HookService_,
          _WorkPackagesOverviewService_,
          _$q_,
          _I18n_) {
    var workPackageId = 99;

    HookService = _HookService_;
    WorkPackagesOverviewService = _WorkPackagesOverviewService_;
    $q = _$q_;
    I18n = _I18n_;

    buildController = function() {
      scope = $rootScope.$new();
      scope.workPackage = angular.copy(workPackage);

      ctrl = $controller("DetailsTabOverviewController", {
        $scope:  scope,
        I18n: I18n,
        UserService: UserService,
        VersionService: VersionService,
        CustomFieldHelper: CustomFieldHelper,
        WorkPackagesOverviewService: WorkPackagesOverviewService,
        HookService: HookService
      });

      $timeout.flush();
    };
  }));

  describe('initialisation', function() {
    it('should initialise', function() {
      buildController();
    });
  });

  describe('work package properties', function() {
    function getProperties() {
      var properties = [];

      angular.forEach(scope.groupedAttributes, function(group) {
        angular.forEach(group.attributes, function(attribute) {
          properties.push(attribute);
        });
      });

      return properties;
    }

    function fetchPresentPropertiesWithName(propertyName) {
      return getProperties().filter(function(propertyData) {
        return propertyData.property === propertyName && propertyData.value != null;
      });
    }

    function fetchEmptyPropertiesWithName(propertyName) {
      return getProperties().filter(function(propertyData) {
        return propertyData.property === propertyName && propertyName.value == null;
      });
    }

    var shouldBehaveLikePropertyWithValue = function(propertyName) {
      it('adds property to present properties', function() {
        expect(fetchPresentPropertiesWithName(propertyName)).to.have.length(1);
      });
    };

    var shouldBehaveLikePropertyWithNoValue = function(propertyName) {
      it('adds property to present properties', function() {
        expect(fetchEmptyPropertiesWithName(propertyName)).to.have.length(1);
      });
    };

    describe('when the property has a value', function() {
      beforeEach(function() {
        buildController();
      });

      describe('status', function() {
        var propertyName = 'status';

        shouldBehaveLikePropertyWithValue(propertyName);
      });

      describe('percentage done', function() {
        var propertyName = 'percentageDone';

        shouldBehaveLikePropertyWithValue(propertyName);
      });
    });

    describe ('unallowed property', function() {
      beforeEach(function() {
        buildController();
      });

      it('removes spentTime if link not present', function() {
        var group = _.find(scope.groupedAttributes, function(group) {
          return group.groupName === 'estimatesAndTime';
        });

        expect(group['spentTime']).to.equal(undefined);
      });
    });

    describe ('allowed property', function() {
      beforeEach(function() {
        workPackage.links = {
          timeEntries: {
            href: 'bogus'
          }
        };
        buildController();
      });

      // This here is bad. For whatever reasons, we are altering
      // the workPackage variable with each test
      // generating dependencies between our tests.
      afterEach(function() {
        workPackage.links = {
        };
      });

      it('has spentTime if link is present', function() {
        var group = _.find(scope.groupedAttributes, function(group) {
          return group.groupName === 'estimatesAndTime';
        });

        expect(group['spentTime']).to.equal(undefined);
      });
    });

    describe('when the property has NO value', function() {
      beforeEach(function() {
        buildController();
      });

      describe('estimated Time', function() {
        var propertyName = 'estimatedTime';

      });
    });

    describe('date property', function() {
      var startDate = '2014-07-09',
          dueDate   = '2014-07-10',
          placeholder = 'placeholder';


      describe('when only the due date is present', function() {
        beforeEach(function() {
          sinon.stub(I18n, 't')
               .withArgs('js.label_no_start_date')
               .returns(placeholder);

          workPackage.props.startDate = null;
          workPackage.props.dueDate = dueDate;

          buildController();
        });

        afterEach(function() {
          I18n.t.restore();
        });

        it('renders the due date and a placeholder for the start date as date property', function() {
          expect(fetchPresentPropertiesWithName('date')[0].value).to.equal(placeholder + ' - 07/10/2014');
        });
      });

      describe('when only the start date is present', function() {
        beforeEach(function() {
          sinon.stub(I18n, 't')
               .withArgs('js.label_no_due_date')
               .returns(placeholder);

          workPackage.props.startDate = startDate;
          workPackage.props.dueDate = null;

          buildController();
        });

        afterEach(function() {
          I18n.t.restore();
        });

        it('renders the start date and a placeholder for the due date as date property', function() {
          expect(fetchPresentPropertiesWithName('date')[0].value).to.equal('07/09/2014 - ' + placeholder);
        });
      });

      describe('when both - start and due date are present', function() {
        beforeEach(function() {
          workPackage.props.startDate = startDate;
          workPackage.props.dueDate = dueDate;

          buildController();
        });

        it('combines them and renders them as date property', function() {
          expect(fetchPresentPropertiesWithName('date')[0].value).to.equal('07/09/2014 - 07/10/2014');
        });
      });
    });

    describe('durations', function() {
      var prepareHourDescription = function(property) {
        beforeEach(function() {
          sinon.stub(I18n, 't', function(locale, parameter) {
            if (locale == 'js.work_packages.properties.' + property) {
              return property;
            } else if (locale == 'js.units.hour') {
              return parameter.count;
            }
          });

          buildController();
        });

        afterEach(function() {
          I18n.t.restore();
        });
      };

      var shouldBehaveLikeValidHourDescription = function(property, hours) {

        prepareHourDescription(property);

        it('should show hours', function() {
          var description = fetchPresentPropertiesWithName(property)[0].value;

          expect(description).to.equal(hours);
        });
      };

      var shouldBehaveLikeValidLinkedHourDescription = function(property, hours, link) {
        prepareHourDescription(property);

        it('should show hours', function() {
          var description = fetchPresentPropertiesWithName(property)[0].value.title;

          expect(description).to.equal(hours);
        });

        it('should have a link', function() {
          var href = fetchPresentPropertiesWithName(property)[0].value.href;

          expect(href).to.equal(link);
        });
      };

      var shouldBehaveLikeItNotExists = function(property) {
        prepareHourDescription(property);

        it('should should not exist', function() {
          var property = fetchPresentPropertiesWithName(property);

          expect(property.length).to.equal(0);
        });
      };

      describe('estimated time', function() {
        context('default value', function() {
          shouldBehaveLikeValidHourDescription('estimatedTime', 0);
        });

        context('time set', function() {
          beforeEach(function() {
            workPackage.props.estimatedTime = 'P2DT4H';
          });

          shouldBehaveLikeValidHourDescription('estimatedTime', 52);
        });
      });

      describe('spent time', function() {
        context('with a link to timeEntries', function() {
          var spentTimeLink = '/work_packages/' + workPackage.props.id + '/time_entries';

          beforeEach(function() {
            workPackage.links = {
              timeEntries: {
                href: spentTimeLink
              }
            };
          });

          // This here is bad. For whatever reasons, we are altering
          // the workPackage variable with each test
          // generating dependencies between our tests.
          afterEach(function() {
            workPackage.links = {
            };
          });

          context('default value', function() {
            beforeEach(function() {
              workPackage.props.spentTime = undefined;
            });

            shouldBehaveLikeValidLinkedHourDescription('spentTime', 0, spentTimeLink);
          });

          context('time set', function() {
            beforeEach(function() {
              workPackage.props.spentTime = 'P2DT4H';
            });

            shouldBehaveLikeValidLinkedHourDescription('spentTime', 52, spentTimeLink);
          });
        });
      });

      context('without a link to timeEntries', function() {
        context('default value', function() {

          beforeEach(function() {
            workPackage.props.spentTime = undefined;
          });

          shouldBehaveLikeItNotExists('spentTime');
        });

        context('time set', function() {
          beforeEach(function() {
            workPackage.props.spentTime = 'P2DT4H';
          });

          shouldBehaveLikeItNotExists('spentTime');
        });
      });
    });

    describe('custom field properties', function() {
      var customPropertyName = 'color';

      describe('when the property has a value', function() {
        beforeEach(function() {
          sinon.spy(CustomFieldHelper, 'formatCustomFieldValue');

          buildController();
        });

        afterEach(function() {
          CustomFieldHelper.formatCustomFieldValue.restore();
        });

        it('adds properties to present properties', function() {
          expect(fetchPresentPropertiesWithName(customPropertyName)).to.have.length(1);
        });

        it('formats values using the custom field helper', function() {
          expect(CustomFieldHelper.formatCustomFieldValue.calledWith('red', 'text')).to.be.true;
        });
      });

      describe('when the property does not have a value', function() {
        beforeEach(function() {
          workPackage.props.customProperties[0].value = null;
          buildController();
        });

        it('adds the custom property to empty properties', function() {
          expect(fetchEmptyPropertiesWithName(customPropertyName)).not.to.be.empty;
        });
      });

      describe('user custom property', function() {
        var userId = '1';
        var userName = 'A test user name';
        var userCFName = 'User CF';
        var userStubReturn;

        var getUserStub;

        before(function() {
          workPackage.props.customProperties[0].value = userId;
          workPackage.props.customProperties[0].name = userCFName;
          workPackage.props.customProperties[0].format = 'user';

        });

        describe('with an existing user', function() {
          var customUser;

          before(function() {
            userStubReturn = { props: { id: userId, name: userName } };

            getUserStub = sinon.stub(UserService, 'getUser');
            getUserStub.withArgs(userId);
            getUserStub.returns(userStubReturn);

            buildController();

            customUser = fetchPresentPropertiesWithName(userCFName)[0].value;
          });

          after(function() {
            getUserStub.restore();
          });

          it('it sets the user name for title', function() {
            expect(customUser.title).to.equal(userName);
          });

          it('it sets the link to the user for href', function() {
            expect(customUser.href).to.equal('/users/' + userId);
          });

          it('it is viewable', function() {
            expect(customUser.viewable).to.be.true;
          });
        });

        describe('with a not existing user', function() {
          var customUser;

          before(function() {
            var reject = $q.reject('For test reasons!');

            userStubReturn = reject;

            getUserStub = sinon.stub(UserService, 'getUser');
            getUserStub.withArgs(userId);
            getUserStub.returns(userStubReturn);

            buildController();

            customUser = fetchPresentPropertiesWithName(userCFName)[0].value;
          });

          after(function() {
            getUserStub.restore();
          });

          it('it sets an error message as title', function() {
            expect(customUser.title).to.equal(I18n.t('js.error_could_not_resolve_version_name'));
          });

          it('it sets the link to the user for href', function() {
            expect(customUser.href).to.equal('/users/' + userId);
          });

          it('it is viewable', function() {
            expect(customUser.viewable).to.be.true;
          });
        });
      });
    });

    describe('Plug-in properties', function() {
      var propertyName = 'myPluginProperty';
      var directiveName = 'my-plugin-property-directive';

      before(function() {
        var workPackageOverviewAttributesStub = sinon.stub(HookService, "call");

        workPackageOverviewAttributesStub.withArgs('workPackageOverviewAttributes',
                                                   { type: propertyName,
                                                     workPackage: workPackage })
                                         .returns([directiveName]);
        workPackageOverviewAttributesStub.returns([]);

        WorkPackagesOverviewService.addAttributesToGroup('other', [propertyName]);

        sinon.stub(I18n, 't').returnsArg(0);

        buildController();
      });

      after(function() {
        I18n.t.restore();
      });

      it('adds plug-in property to present properties', function() {
        expect(fetchPresentPropertiesWithName(propertyName)).to.have.length(1);
      });

      it('adds plug-in property to present properties', function() {
        var propertyData = fetchPresentPropertiesWithName(propertyName)[0];

        expect(propertyData.property).to.eq(propertyName);
        expect(propertyData.format).to.eq('dynamic');
        expect(propertyData.value).to.eq(directiveName);
      });
    });

    describe('Properties are sorted', function() {
      var propertyNames = ['a', 'b', 'c'];

      beforeEach(function() {
        var stub = sinon.stub(I18n, 't');

        stub.withArgs('js.work_packages.properties.a').returns('z');
        stub.withArgs('js.work_packages.properties.b').returns('y');
        stub.withArgs('js.work_packages.properties.c').returns('x');
        stub.returnsArg(0);

        WorkPackagesOverviewService.addAttributesToGroup('other', propertyNames);

        buildController();
      });

      afterEach(function() {
        I18n.t.restore();
      });

      it('sorts list of non-empty properties', function() {
        var isSorted = function(element, index, array) {
          return index === 0 || String(array[index - 1].label.toLowerCase()) <= String(element.label.toLowerCase());
        };
        var groupOtherAttributes = WorkPackagesOverviewService.getGroupAttributesForGroupedAttributes('other', scope.groupedAttributes);
        expect(groupOtherAttributes.every(isSorted)).to.be.true;
      });
    });

    describe('anyEmptyWorkPackageValue', function() {
      describe('with a group having empty attributes', function() {
        before(function() {
          scope.groupedAttributes = [ { attributes: [ { value: 'a' }, { value: null } ] },
                                      { attributes: [ { value: 'b' }, { value: 'c' } ] } ];
        });

        it('is true', function() {
          expect(scope.anyEmptyWorkPackageValue()).to.be.true;
        });
      });

      describe('with no group having empty attributes', function() {
        before(function() {
          scope.groupedAttributes = [ { attributes: [ { value: 'a' }, { value: 'd' } ] },
                                      { attributes: [ { value: 'b' }, { value: 'c' } ] } ];
        });

        it('is false', function() {
          expect(scope.anyEmptyWorkPackageValue()).to.be.false;
        });
      });
    });

    describe('isGroupEmpty', function() {
      describe('for a group having at least one non empty attribute', function() {
        var group = { attributes: [ { value: 'a' }, { value: null } ] };

        it('is false', function() {
          expect(scope.isGroupEmpty(group)).to.be.false;
        });
      });

      describe('for a group having only empty attributes', function() {
        var group = { attributes: [ { value: null }, { value: null } ] };

        it('is true', function() {
          expect(scope.isGroupEmpty(group)).to.be.true;
        });
      });
    });
  });
});
