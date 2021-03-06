require 'spec_helper'
require 'features/page_objects/notification'

describe 'edit work package', js: true do
  let(:dev_role) do
    FactoryGirl.create :role,
                       permissions: [:view_work_packages,
                                     :add_work_packages]
  end
  let(:dev) do
    FactoryGirl.create :user,
                       firstname: 'Dev',
                       lastname: 'Guy',
                       member_in_project: project,
                       member_through_role: dev_role
  end
  let(:manager_role) do
    FactoryGirl.create :role,
                       permissions: [:view_work_packages,
                                     :edit_work_packages]
  end
  let(:manager) do
    FactoryGirl.create :admin,
                       firstname: 'Manager',
                       lastname: 'Guy',
                       member_in_project: project,
                       member_through_role: manager_role
  end

  let(:cf_all) do
    FactoryGirl.create :work_package_custom_field, is_for_all: true, field_format: 'text'
  end

  let(:cf_tp1) do
    FactoryGirl.create :work_package_custom_field, is_for_all: true, field_format: 'text'
  end

  let(:cf_tp2) do
    FactoryGirl.create :work_package_custom_field, is_for_all: true, field_format: 'text'
  end

  let(:type) { FactoryGirl.create :type, custom_fields: [cf_all, cf_tp1] }
  let(:type2) { FactoryGirl.create :type, custom_fields: [cf_all, cf_tp2] }
  let(:project) { FactoryGirl.create(:project, types: [type, type2]) }
  let(:work_package) { FactoryGirl.create(:work_package, author: dev, project: project, type: type) }

  let(:new_subject) { 'Some other subject' }
  let(:wp_page) { Pages::FullWorkPackage.new(work_package) }
  let(:priority2) { FactoryGirl.create :priority }
  let(:status2) { FactoryGirl.create :status }
  let(:workflow) do
    FactoryGirl.create :workflow,
                       type_id: type2.id,
                       old_status: work_package.status,
                       new_status: status2,
                       role: manager_role
  end
  let(:version) { FactoryGirl.create :version, project: project }
  let(:category) { FactoryGirl.create :category, project: project }

  let(:visit_before) { true }

  def visit!
    wp_page.visit!
    wp_page.ensure_page_loaded
  end

  before do
    login_as(manager)

    manager
    dev
    priority2
    workflow

    if visit_before
      visit!
    end
  end

  context 'with progress' do
    let(:visit_before) { false }

    before do
      work_package.update done_ratio: 42
      visit!
    end

    it 'does not hide empty progress while it is being edited' do
      wp_page.update_attributes({ percentageDone: '0' }, save: false)

      expect(page).to have_text("Progress (%)")
    end
  end

  it 'allows updating and seeing the results' do
    wp_page.view_all_attributes

    wp_page.update_attributes subject: 'a new subject',
                              type: type2.name,
                              startDate: '2013-03-04',
                              dueDate: '2013-03-20',
                              responsible: manager.name,
                              assignee: manager.name,
                              estimatedTime: '5.00',
                              priority: priority2.name,
                              version: version.name,
                              category: category.name,
                              percentageDone: '30',
                              status: status2.name,
                              description: 'a new description'

    wp_page.expect_attributes type: type2.name,
                              responsible: manager.name,
                              assignee: manager.name,
                              startDate: '03/04/2013',
                              dueDate: '03/20/2013',
                              estimatedTime: '5',
                              percentageDone: '30% Total progress',
                              subject: 'a new subject',
                              description: 'a new description',
                              priority: priority2.name,
                              status: status2.name,
                              version: version.name,
                              category: category.name
  end

  it 'correctly assigns and un-assigns users' do
    wp_page.view_all_attributes

    wp_page.update_attributes assignee: manager.name
    wp_page.expect_attributes assignee: manager.name

    wp_page.update_attributes assignee: '-'
    wp_page.expect_attributes assignee: '-'

    # Ensure the value is not only stored in the WP resource
    wp_page.visit!
    wp_page.ensure_page_loaded
    wp_page.view_all_attributes
    wp_page.expect_attributes assignee: '-'

    work_package.reload
    expect(work_package.assigned_to).to be_nil
  end

  context 'switching to custom field with required CF' do
    let(:custom_field) {
      FactoryGirl.create(
        :work_package_custom_field,
        field_format: 'string',
        default_value: nil,
        is_required:  true,
        is_for_all:   true
      )
    }
    let!(:type2) { FactoryGirl.create(:type, custom_fields: [custom_field]) }

    it 'shows the required field when switching' do
      page.click_button(I18n.t('js.button_edit'))
      type_field = wp_page.edit_field(:type)

      type_field.set_value type2.name
      expect(type_field.input_element).to have_selector('option:checked', text: type2.name)

      cf_field = wp_page.edit_field("customField#{custom_field.id}")
      cf_field.expect_active!
      cf_field.expect_value('')
    end
  end

  it 'allows the user to add a comment to a work package with previewing the stuff before' do
    wp_page.ensure_page_loaded

    wp_page.trigger_edit_comment
    wp_page.update_comment 'hallo welt'
    wp_page.preview_comment

    expect(page).to have_text 'hallo welt'

    wp_page.save_comment

    expect(page).to have_text 'hallo welt'
  end

  it 'updates the presented custom fields based on the selected type' do
    wp_page.ensure_page_loaded
    wp_page.view_all_attributes

    wp_page.expect_attributes "customField#{cf_all.id}" => '',
                              "customField#{cf_tp1.id}" => ''
    wp_page.expect_attribute_hidden "customField#{cf_tp2.id}"

    wp_page.update_attributes "customField#{cf_all.id}" => 'bird is the word',
                              'type' => type2.name

    wp_page.expect_attributes "customField#{cf_all.id}" => 'bird is the word',
                              "customField#{cf_tp2.id}" => ''
    wp_page.expect_attribute_hidden "customField#{cf_tp1.id}"
  end

  it 'shows an error if a subject is entered which is too long' do
    too_long = ('Too long. Can you feel it? ' * 10).strip

    wp_page.ensure_page_loaded
    wp_page.update_attributes subject: too_long

    wp_page.expect_notification message: 'Subject is too long (maximum is 255 characters)',
                                type: 'error'
  end
end
